"use client";

console.log("📁 SIMPLE ACCESS REQUESTS PAGE LOADED!");

export default function SimpleAccessRequests() {
  return (
    <div style={{padding: '20px', background: 'lightblue', color: 'black', minHeight: '100vh'}}>
      <h1>🔔 Simple Access Requests</h1>
      <p>This is a test version that should definitely work!</p>
      
      <div style={{background: 'white', padding: '20px', margin: '20px 0', borderRadius: '8px'}}>
        <h2>Test Bell Icon: 🔔</h2>
        <p>If you can see this page, the routing works!</p>
        <button 
          onClick={() => alert('Test button works!')}
          style={{background: 'blue', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
        >
          Test Button
        </button>
      </div>
      
      <div style={{background: 'yellow', padding: '10px', margin: '10px 0'}}>
        <strong>Debug Info:</strong><br/>
        URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}<br/>
        Time: {new Date().toLocaleString()}
      </div>
    </div>
  );
}
