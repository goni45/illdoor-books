import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
type State={error:Error|null};
export class AppErrorBoundary extends React.Component<React.PropsWithChildren,State>{
 state:State={error:null}; static getDerivedStateFromError(error:Error){return{error}};
 componentDidCatch(error:Error,info:React.ErrorInfo){console.error('Application render failed:',error,info.componentStack)}
 render(){if(!this.state.error)return this.props.children;return <main className="min-h-screen bg-[#ededed] p-6 flex items-center justify-center"><section className="max-w-xl rounded-3xl border bg-white p-8 text-center"><AlertTriangle className="mx-auto text-rose-600"/><h1 className="mt-4 text-xl font-bold">The marketplace could not start</h1><p className="mt-2 text-sm text-neutral-600">A runtime error was caught instead of showing a blank page.</p><pre className="mt-4 overflow-auto rounded-xl bg-rose-50 p-3 text-left text-xs">{this.state.error.message}</pre><button onClick={()=>location.reload()} className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-white"><RefreshCw className="h-4 w-4"/>Refresh</button></section></main>}
}
