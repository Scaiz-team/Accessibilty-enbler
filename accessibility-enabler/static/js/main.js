document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('proxyForm');
    const input = document.getElementById('urlInput');

    form.addEventListener('submit', (e) => {
        // Simple client side validation or animation before submit
        let url = input.value.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            input.value = 'https://' + url;
        }
        
        const btn = form.querySelector('.btn-primary');
        btn.innerHTML = '<span>Processing...</span>';
        btn.style.opacity = '0.8';
        btn.style.cursor = 'wait';
    });
});
