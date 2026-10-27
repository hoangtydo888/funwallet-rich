export type ConnectionStage='unlock'|'accounts'|'permissions'|'done';
export function ConnectionSteps({stage}:{stage:ConnectionStage}){
 const steps=[['unlock','Mở khóa'],['accounts','Tài khoản'],['permissions','Xem quyền'],['done','Kết nối']] as const;
 const active=steps.findIndex(([key])=>key===stage);
 return <ol className="connection-steps" aria-label="Tiến trình kết nối">{steps.map(([key,label],index)=><li key={key} aria-current={key===stage?'step':undefined} className={index<=active?'is-active':''}><span aria-hidden="true">{index<active?'✓':index+1}</span><span>{label}</span></li>)}</ol>;
}
