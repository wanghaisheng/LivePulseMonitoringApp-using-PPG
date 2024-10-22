let video = document.getElementById('videoElement');
let canvas = document.getElementById('canvasElement');
let context = canvas.getContext('2d');
let status = document.getElementById('status');
let startTestBtn = document.getElementById('startTest');
let stopTestBtn = document.getElementById('stopTest');
const HRcalculatedValueElement = document.getElementById('heartRateValue');


let stream; // to hold the video stream
let capturing = false;
let frameCount = 0;
const samplingRate = 30; // Samples per second (FPS)
let maxFrames = 35 * samplingRate; // Samples per second (FPS); // 30 seconds * 30 fps
let dataRed = [];
let dataGreen = [];
let dataBlue = [];

let duration = 0;
let x = 0;
const totalChunks = 6; // Number of 5-second chunks
const redValues = []; // Array to hold red signal values

startTestBtn.addEventListener('click', startCamera);
stopTestBtn.addEventListener('click', stopCapture);

// Start camera and video stream
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
    .then((mediaStream) => {
        stream = mediaStream;
        video.srcObject = stream;
        status.textContent = 'Camera is active. Capturing frames...';
        
        // Start capturing frames after the video starts playing
        video.onloadedmetadata = () => {
            capturing = true;
            captureFrames();
        };
    })
    .catch((err) => {
        console.error("Error accessing the camera: ", err);
        status.textContent = 'Error accessing the camera. Please allow camera permissions.';
    });
}

// Stop capturing frames
function stopCapture() {
    if (capturing) {
        capturing = false;
        if (stream) {
            stream.getTracks().forEach(track => track.stop()); // stop camera stream
        }
        status.textContent = 'Test Completed!';
    }
}

// Capture 30 frames per second for 35 seconds
function captureFrames() {
    let frameInterval = setInterval(() => {
        if (frameCount >= maxFrames || !capturing) {
            clearInterval(frameInterval);
            stopCapture();
            return;
        }

        // Draw the current frame from the video to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get the pixel data from the canvas
        let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        let pixels = imageData.data;

        // Calculate the average RGB values for the frame
        let redSum = 0, greenSum = 0, blueSum = 0;
        let pixelCount = 0;

        for (let i = 0; i < pixels.length; i += 4) {
            redSum += pixels[i];       // Red channel
            greenSum += pixels[i + 1]; // Green channel
            blueSum += pixels[i + 2];  // Blue channel
            pixelCount++;
        }

        let avgRed = redSum / pixelCount;
        let avgGreen = greenSum / pixelCount;
        let avgBlue = blueSum / pixelCount;

        dataRed.push(avgRed);
        dataGreen.push(avgGreen);
        dataBlue.push(avgBlue);

        // Log the RGB values to the console
        console.log(`Frame ${frameCount + 1}: Avg Red: ${avgRed}, Avg Green: ${avgGreen}, Avg Blue: ${avgBlue}`);

        frameCount++;
        // Calculate heart rate every 5 seconds
        if (frameCount % (samplingRate * 5) === 0 && dataRed.length>160) {
            calculateHeartRate();
        }
        
    }, 33); // Capture a frame every ~33 milliseconds (approx. 30 fps)
    console.log(dataRed.toString());
}


// Normalize the signal (z-score normalization)
function normalizeSignal(signal) {
    const mean = signal.reduce((acc, val) => acc + val, 0) / signal.length;
    const stdDev = Math.sqrt(signal.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / signal.length);
    return signal.map(value => (value - mean) / stdDev);
}

function findPeaks(arr, samplingRate) {
    const peaks = [];
    const n = arr.length;

    // Calculate the minimum number of samples between peaks
    const minSamplesBetweenPeaks = Math.floor(samplingRate * 0.5);

    for (let i = 0; i < n; i++) {
        // Check if it's a peak
        if ((i === 0 || arr[i] > arr[i - 1]) && (i === n - 1 || arr[i] >= arr[i + 1])) {
            // If we found a peak, check the distance to the last peak
            if (peaks.length === 0 || i - peaks[peaks.length - 1].index >= minSamplesBetweenPeaks) {
                peaks.push({ value: arr[i], index: i });

                // Move to the end of the plateau
                while (i + 1 < n && arr[i] === arr[i + 1]) {
                    i++;
                }
            }
        }
    }

    const peakValues = peaks.map(peak => peak.value);
    console.log("Peaks", peakValues);
    return peakValues;
}


// Calculate heart rate based on the red values
function calculateHeartRate() {
    x += 150; // Increase sample count by 150 points per iteration
    duration += 5; // 5 seconds added in each iteration
    const currentRedValues = dataRed.slice(150); // Get data up to the current sample count
    console.log("Length of Red Values", dataRed.length);
    if (currentRedValues.length > 0) {
        // Normalize the signal
        const normalizedRedValues = normalizeSignal(currentRedValues);

        // Find peaks in the normalized signal
        const peaks = findPeaks(normalizedRedValues, samplingRate);

        // Calculate heart rate (number of peaks per minute)
        const heartRate = Math.round((peaks.length / duration) * 60); // Convert peaks to BPM
        HRcalculatedValueElement.textContent = heartRate;
        console.log(`Estimated Heart Rate for ${duration} seconds: ${heartRate} BPM`);
    } else {
        console.log("No data collected.");
    }

}
