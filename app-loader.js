(async function () {
  const source = await fetch('/app.js').then(r => {
    if (!r.ok) throw new Error('Could not load application code');
    return r.text();
  });
  window.rfBootstrap(function () {
    const script = document.createElement('script');
    script.textContent = source;
    document.body.appendChild(script);
  });
})().catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin',
    '<div style="padding:12px;background:#fee;color:#900">Application failed to load. Please refresh or check the server.</div>');
});