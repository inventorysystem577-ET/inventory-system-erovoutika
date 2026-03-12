"use client";

export default function AccessRequestsPage() {
  return (
    <div style={{padding: '20px', background: '#f3f4f6', minHeight: '100vh'}}>
      <div style={{background: 'red', color: 'white', padding: '10px', marginBottom: '20px'}}>
        🧪 ACCESS REQUESTS PAGE - TEST
      </div>
      
      <div style={{background: 'white', padding: '20px', borderRadius: '8px'}}>
        <h1>🔔 Access Requests</h1>
        <p>Bell and notification system test page.</p>
        
        <div style={{display: 'flex', gap: '10px', marginTop: '20px', alignItems: 'center'}}>
          <span style={{fontSize: '30px'}}>🔔</span>
          <span style={{background: '#e5e7eb', padding: '8px 12px', borderRadius: '4px'}}>
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
