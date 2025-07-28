function initializeCanvasFilter(isDarkMode, isColorblindMode) {
    const canvas = document.getElementById('filterCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to cover the entire viewport
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Capture the entire page as an image
    function capturePage() {
        return new Promise((resolve) => {
            html2canvas(document.body, {
                scale: 1,
                useCORS: true,
                logging: false
            }).then(canvas => {
                resolve(canvas);
            });
        });
    }

    // Apply color filters
    async function applyFilter() {
        const tempCanvas = await capturePage();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            if (isColorblindMode) {
                // Green to teal (reduce green, increase blue)
                if (g > r && g > b && g > 100) { // Detect green dominant pixels
                    data[i] = Math.min(255, r + 20); // Slightly increase red
                    data[i + 1] = Math.max(0, g - 50); // Reduce green
                    data[i + 2] = Math.min(255, b + 50); // Increase blue for teal
                }
                // Red to orange (reduce red, increase green)
                if (r > g && r > b && r > 100) { // Detect red dominant pixels
                    data[i] = Math.max(0, r - 30); // Reduce red
                    data[i + 1] = Math.min(255, g + 50); // Increase green for orange
                    data[i + 2] = b; // Keep blue
                }
            }

            if (isDarkMode) {
                // Invert colors for dark mode
                data[i] = 255 - r;
                data[i + 1] = 255 - g;
                data[i + 2] = 255 - b;
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // Initial filter application
    applyFilter();

    // Update filter on content change
    const observer = new MutationObserver(() => applyFilter());
    observer.observe(document.body, { childList: true, subtree: true });
}

function updateCanvasFilter(isDarkMode, isColorblindMode) {
    initializeCanvasFilter(isDarkMode, isColorblindMode);
}