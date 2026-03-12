"use client";

export default function AccessRequestsPage() {
  return (
    <div style={{padding: '20px', background: 'lightgreen', minHeight: '100vh'}}>
      <h1>🔔 ACCESS REQUESTS</h1>
      <div style={{background: 'white', padding: '20px', borderRadius: '8px', marginTop: '20px'}}>
        <p><strong>Status:</strong> Page is working!</p>
        <div style={{display: 'flex', gap: '10px', marginTop: '20px', alignItems: 'center'}}>
          <span style={{fontSize: '30px'}}>🔔</span>
          <span style={{background: '#e5e7eb', padding: '8px 16px', borderRadius: '4px'}}>
            Bell: IDLE
          </span>
          <button style={{background: '#3b82f6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>
            Test Notification
          </button>
        </div>
      </div>
    </div>
  );
}
