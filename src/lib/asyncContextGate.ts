/** Reject stale results after auth/account changes or a newer request starts. */
export class AsyncContextGate {
 private context:string|null=null;private revision=0;private sequence=0;
 setContext(context:string|null){if(context!==this.context){this.context=context;this.revision++;}}
 start(){return {context:this.context,revision:this.revision,sequence:++this.sequence};}
 accepts(ticket:{context:string|null;revision:number;sequence:number}){return ticket.context===this.context&&ticket.revision===this.revision&&ticket.sequence===this.sequence;}
}
