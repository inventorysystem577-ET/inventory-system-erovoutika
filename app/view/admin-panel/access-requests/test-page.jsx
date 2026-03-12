"use client";

export default function TestPage() {
  return (
    <div style={{padding: '20px', background: 'lightgreen'}}>
      <h1>🧪 TEST PAGE - ACCESS REQUESTS</h1>
      <p>If you can see this, the route works!</p>
      <p>Time: {new Date().toLocaleString()}</p>
      <p>URL: {typeof window !== 'undefined' ? window.location.href : 'Server side'}</p>
    </div>
  );
}
