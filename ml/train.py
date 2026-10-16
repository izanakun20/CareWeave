"""CareWeave training pipeline. Run from repo root:  python ml/train.py
Reads data/*.csv, evaluates on a time-aware split (train Jan-Sep, test Oct-Dec), refits on all data,
writes ml/artifacts/{model,insights,parity}.json. Models are trained by us (numpy OLS + empirical residual quantiles); no external AI API."""
import json, numpy as np, pandas as pd
from pathlib import Path
D=Path(__file__).resolve().parent.parent/'data'; OUT=Path(__file__).resolve().parent/'artifacts'; OUT.mkdir(exist_ok=True)
TRI=['Critical','High','Medium','Low']
p=pd.read_csv(D/'patients.csv'); e=pd.read_csv(D/'encounters.csv'); d=pd.read_csv(D/'departments.csv'); t=pd.read_csv(D/'diagnostic_tests.csv')
for c in ['arrival_time','service_start_time','service_end_time','discharge_time']: e[c]=pd.to_datetime(e[c])
e=e.sort_values('arrival_time').reset_index(drop=True); DEPTS=list(d.department_id)
tr=e[e.arrival_time<'2025-10-01']; te=e[e.arrival_time>='2025-10-01']
# ---------- model: OLS additive (department + triage) + empirical residual quantiles by triage ----------
def X(df):
    m=np.zeros((len(df),15)); m[:,0]=1
    for i,dp in enumerate(DEPTS[1:]): m[:,1+i]=(df.department_id==dp).values
    for i,tl in enumerate(['High','Medium','Low']): m[:,12+i]=(df.triage_level==tl).values
    return m
PQ=np.linspace(.01,.99,99)
def fit(df):
    b=np.linalg.lstsq(X(df),df.wait_minutes.values,rcond=None)[0]; res=df.wait_minutes.values-X(df)@b
    return b,{k:np.quantile(res[(df.triage_level==k).values],PQ) for k in TRI}
def predict(b,rq,df,qs=(.1,.5,.9)):
    mu=X(df)@b; out={'mean':mu}
    for q in qs: out[q]=np.array([max(2,m+np.interp(q,PQ,rq[k])) for m,k in zip(mu,df.triage_level)])
    return out
def pin(y,f,q): r=y-f; return np.mean(np.maximum(q*r,(q-1)*r))
b,rq=fit(tr); P=predict(b,rq,te); y=te.wait_minutes.values; mae=lambda f:float(np.mean(np.abs(y-f)))
cell=tr.groupby(['department_id','triage_level']).wait_minutes.mean(); trimean=tr.groupby('triage_level').wait_minutes.mean()
base_mae=mae(np.full(len(y),tr.wait_minutes.mean())); tri_mae=mae(te.triage_level.map(trimean).values)
cell_mae=mae(te.set_index(['department_id','triage_level']).index.map(cell).values.astype(float))
# ---------- challenger: gradient boosting + feature ablation ----------
from sklearn.ensemble import HistGradientBoostingRegressor as HGB
full=e.merge(d,on='department_id').merge(p,on='patient_id',how='left')
full['hour']=full.arrival_time.dt.hour; full['dow']=full.arrival_time.dt.dayofweek; full['month']=full.arrival_time.dt.month
cats=['department_id','triage_level','visit_type','sex','chronic_condition','insurance_type']
F=full[cats+['hour','dow','month','age','staff_count','bed_count','daily_capacity']].copy()
for c in cats: F[c]=F[c].astype('category')
mtr=(full.arrival_time<'2025-10-01').values; yy=full.wait_minutes.values
def gb(cols): return float(np.mean(np.abs(yy[~mtr]-HGB(max_iter=200,learning_rate=.05,categorical_features='from_dtype',random_state=0).fit(F.loc[mtr,cols],yy[mtr]).predict(F.loc[~mtr,cols]))))
core=['department_id','triage_level']; ablation=[['department + triage (reference)',gb(core)]]
for name,extra in [('+ hour of day',['hour']),('+ weekday',['dow']),('+ month',['month']),('+ age, sex, insurance, chronic condition',['age','sex','insurance_type','chronic_condition']),('+ visit type',['visit_type']),('+ department staff, beds, capacity',['staff_count','bed_count','daily_capacity'])]: ablation.append([name,gb(core+extra)])
gb_all=gb(list(F.columns))
# ---------- interval coverage and calibration of P(wait >= t) ----------
cov=float(np.mean((y>=P[.1])&(y<=P[.9]))); pin_=[float(pin(y,P[q],q)) for q in (.1,.5,.9)]
def prob(mu,k,thr): return float(np.mean(mu+rq[k]>=thr))
cal=[]
for thr in (30,45,60,75,90):
    pr=np.array([prob(m,k,thr) for m,k in zip(P['mean'],te.triage_level)]); ob=(y>=thr).astype(float)
    cal.append(dict(threshold=thr,predicted=float(pr.mean()),observed=float(ob.mean()),brier=float(np.mean((pr-ob)**2)),brier_base_rate=float(np.mean((tr.wait_minutes.ge(thr).mean()-ob)**2))))
from sklearn.metrics import roc_auc_score
auc=float(roc_auc_score(y>=60,np.array([prob(m,k,60) for m,k in zip(P['mean'],te.triage_level)])))
# ---------- alert backtest on Oct-Dec: rolling 14-day mean residual z-score, one-sided z>3 ----------
sig=float(np.std(tr.wait_minutes.values-X(tr)@b)); te=te.assign(res=y-P['mean'],day=(te.arrival_time-pd.Timestamp('2025-10-01')).dt.days)
def alerts(res,day):
    out=[]
    for end in range(13,92):
        w=(day>=end-13)&(day<=end); n=w.sum()
        out.append(end if n>=8 and res[w].mean()/(sig/np.sqrt(n))>3 else None)
    return out
fa=[];det={s:[] for s in (10,15,20)};lag={s:[] for s in (10,15,20)}
for dp in DEPTS:
    s=te[te.department_id==dp]; res0=s.res.values; day=s.day.values; fa+=[a is not None for a in alerts(res0,day)]
    for sh in det:
        for start in range(14,70,14):
            r=res0+np.where((day>=start)&(day<start+14),sh,0); al=[a for a in alerts(r,day) if a is not None and start<=a<start+14]
            det[sh].append(bool(al))
            if al: lag[sh].append(al[0]-start)
backtest=dict(rule='rolling 14-day mean residual z>3 (one-sided), min 8 visits',false_alarm_window_rate=float(np.mean(fa)),
  injected={str(k):dict(detected=float(np.mean(v)),median_days_to_alert=float(np.median(lag[k])) if lag[k] else None,trials=len(v)) for k,v in det.items()},
  note='Injected delays are simulated to test detection power; the real data contains no such spikes.')
metrics=dict(split=dict(train='2025-01-01..2025-09-30',n_train=len(tr),test='2025-10-01..2025-12-31',n_test=len(te)),
 mae=dict(train_average=base_mae,triage_only=tri_mae,department_triage_cell_mean=cell_mae,ols_additive=mae(P['mean']),gradient_boosting_all_features=gb_all),
 rmse_ols=float(np.sqrt(np.mean((y-P['mean'])**2))),noise_sd_minutes=sig,interval_p10_p90_coverage=cov,pinball=dict(zip(['q10','q50','q90'],pin_)),calibration=cal,auc_wait_ge_60=auc,alerts=backtest)
# ---------- production fit on all data ----------
bF,rqF=fit(e); model=dict(version=1,target='wait_minutes',min_wait=2,departments=DEPTS,triage=TRI,
 intercept=float(bF[0]),dept_effect={dp:(0.0 if i==0 else float(bF[i])) for i,dp in enumerate(DEPTS)},triage_effect={'Critical':0.0,'High':float(bF[12]),'Medium':float(bF[13]),'Low':float(bF[14])},
 residual_quantile_probs=[float(x) for x in PQ],residual_quantiles={k:[float(x) for x in rqF[k]] for k in TRI},
 how_to_predict='mean=intercept+dept_effect+triage_effect; quantile q = max(min_wait, mean + interp(q, probs, residual_quantiles[triage])); P(wait>=t)=mean over the 99 residual quantiles of 1[mean+r>=t]',
 evaluation=metrics,ablation=[dict(features=a,mae=float(m)) for a,m in ablation])
json.dump(model,open(OUT/'model.json','w'),indent=1)
def pred_one(dp,tl,thr=60):
    mu=model['intercept']+model['dept_effect'][dp]+model['triage_effect'][tl]; r=np.array(model['residual_quantiles'][tl]); pq=np.array(model['residual_quantile_probs'])
    return dict(mean=mu,p10=max(2,mu+np.interp(.1,pq,r)),p50=max(2,mu+np.interp(.5,pq,r)),p90=max(2,mu+np.interp(.9,pq,r)),p_ge=float(np.mean(mu+r>=thr)))
json.dump([dict(department_id=dp,triage=tl,threshold=60,**pred_one(dp,tl)) for dp in DEPTS[::3] for tl in TRI],open(OUT/'parity.json','w'),indent=1)
# ---------- dashboard insights ----------
tm=e.groupby('triage_level').wait_minutes.mean().reindex(TRI); mu_all=e.wait_minutes.mean(); e['adj']=e.wait_minutes-e.triage_level.map(tm)
base=tr.groupby(['department_id','triage_level']).wait_minutes.mean(); e['exp']=e.set_index(['department_id','triage_level']).index.map(base); e['res']=e.wait_minutes-e.exp
e['wk']=np.minimum((e.arrival_time.dt.dayofyear-1)//7,51); dep=[]
for _,r in d.iterrows():
    x=e[e.department_id==r.department_id]; cells=[];hist=[]
    for k in TRI:
        w=x[x.triage_level==k].wait_minutes; cells.append(dict(triage=k,n=int(len(w)),mean=round(w.mean(),1),p10=int(w.quantile(.1)),p50=int(w.quantile(.5)),p90=int(w.quantile(.9))))
        hist.append(np.bincount(np.minimum(w//10,15).astype(int),minlength=16).tolist())
    g=x.groupby('wk'); z=(g.res.mean()/(sig/np.sqrt(g.size()))).reindex(range(52)).fillna(0).round(1).tolist()
    dep.append(dict(id=r.department_id,name=r.department_name,service_type=r.service_type,staff=int(r.staff_count),beds=int(r.bed_count),daily_capacity=int(r.daily_capacity),visits=len(x),mean_wait=round(x.wait_minutes.mean(),1),
      triage_mix_effect=round(x.triage_level.map(tm).mean()-mu_all,1),gap_vs_peers=round(x.adj.mean(),1),gap_z=round(x.adj.mean()/(sig/np.sqrt(len(x))),1),cells=cells,hist_10min_bins=hist,weekly_z=z))
t['tat']=(pd.to_datetime(t.completion_time)-pd.to_datetime(t.requested_time)).dt.total_seconds()/60
tt=pd.merge(t,e[['encounter_id','arrival_time','discharge_time']],on='encounter_id'); tt['rq']=pd.to_datetime(tt.requested_time)
sm=lambda g:dict(n=int(len(g)),median=float(g.tat.median()),p90=float(g.tat.quantile(.9)),share_over_120=float((g.tat>120).mean()))
ins=dict(overall=dict(visits=len(e),mean_wait=round(mu_all,1),triage_mean=dict(zip(TRI,[round(v,1) for v in tm]))),departments=dep,
 diagnostics=dict(by_test_type={k:sm(g) for k,g in t.groupby('test_type')},by_priority={k:sm(g) for k,g in t.groupby('priority')},
  timeline_conflict=dict(tests=len(tt),outside_visit_window=int((~((tt.rq>=tt.arrival_time)&(tt.rq<=tt.discharge_time))).sum()),note='Request times do not align with visits; analyse turnaround only.')),
 data_quality=dict(patients_without_visits=int((~p.patient_id.isin(e.patient_id)).sum()),chronic_condition_missing=int(p.chronic_condition.isna().sum()),chronic_condition_missing_pct=round(p.chronic_condition.isna().mean()*100,1),wait_minutes_matches_timestamps=bool(((e.service_start_time-e.arrival_time).dt.total_seconds()/60==e.wait_minutes).all())))
json.dump(ins,open(OUT/'insights.json','w'),indent=1,default=float)
print(json.dumps(metrics,indent=1,default=float)); print(json.dumps(model['ablation'],indent=1)); print(model['intercept'],model['triage_effect'],{k:round(v,1) for k,v in model['dept_effect'].items()})
