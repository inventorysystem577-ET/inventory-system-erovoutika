"use client";

console.log("🧪 TEST PAGE LOADED!");

export default function TestPage() {
  return (
    <div style={{padding: '20px', background: 'yellow', color: 'black'}}>
      <h1>🧪 ADMIN PANEL TEST PAGE</h1>
      <p>If you can see this, the routing works!</p>
      <p>Current URL: {typeof window !== 'undefined' ? window.location.href : 'Server side'}</p>
    </div>
  );
}
