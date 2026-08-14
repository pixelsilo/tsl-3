(() => {
	const renderQrCode = () => {
		const container = document.getElementById('qr-code');
		if (!container) return;

		const image = document.createElement('img');
		image.src = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(window.location.href)}`;
		image.alt = 'QR code for this page';
		image.width = 512;
		image.height = 512;
		image.style.width = '100%';
		image.style.height = '100%';
		image.style.display = 'block';

		container.replaceChildren(image);
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', renderQrCode, { once: true });
	} else {
		renderQrCode();
	}
})();
