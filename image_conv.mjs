
const grayscale_filters = {
    average: (pixel) => {
        return (pixel.r + pixel.g + pixel.b) / 3;
    },
    rec601: (pixel) => {
        return (
            (0.299 * pixel.r) +
            (0.587 * pixel.g) +
            (0.114 * pixel.b)
        )
    },
    itur_bt709: (pixel) => {
        return (
            (0.2126 * pixel.r) +
            (0.7152 * pixel.g) +
            (0.0722 * pixel.b)
        )
    },
    itur_bt2100: (pixel) => {
        return (
            (0.2627 * pixel.r) +
            (0.6780 * pixel.g) +
            (0.0593 * pixel.b)
        )
    }
}

function getPixel(x, y, imageData) {
    const index = (x + y * imageData.width) * 4;
    return {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2],
        a: imageData.data[index + 3]
    };
}

function convertImageBlock(imageData) {
    console.log("imageData", imageData);
    const chars = [
        '█',
        '▒',
        '░'
    ];

    let min_v = 1;
    let max_v = 0;

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const pixel = getPixel(x, y, imageData);
            const grayscale = grayscale_filters.itur_bt709(pixel);
            max_v = Math.max(max_v, grayscale);
            min_v = Math.min(min_v, grayscale);
        }
    }

    let rows = [];
    for (let y = 0; y < imageData.height; y++) {
        let row = [];
        for (let x = 0; x < imageData.width; x++) {
            const pixel = getPixel(x, y, imageData);
            let grayscale = grayscale_filters.itur_bt709(pixel);

            grayscale = (grayscale - min_v) / (max_v - min_v); // Normalize grayscale to [0, 1]

            if (grayscale < 0.3) {
                row.push(chars[0]);
            } else if (grayscale < 0.6) {
                row.push(chars[1]);
            } else {
                row.push(chars[2]);
            }
        }
        rows.push(row.join(""));
    }
    return rows.join("\n");
}

const convertImageInput = document.getElementById("image-to-convert");
const convertImageInputLabel = document.getElementById("image-to-convert-label");
const editor = document.getElementById("paperwork_editor");

convertImageInput.onchange = function(event) {
    editor.disabled = true;
    convertImageInput.disabled = true;
    convertImageInputLabel.classList.add("disabled");
    convertImageInputLabel.textContent = "Loading Image ..."

    const file = convertImageInput.files[0];
    console.log(file);
    const reader = new FileReader();
    reader.onload = function() {
        const blob = new Blob([reader.result]);
        const img = document.createElement("img");

        img.onload = function() {
            const realWidth = img.naturalWidth;
            const realHeight = img.naturalHeight;

            const aspectRatio = realHeight / realWidth;

            const width = Math.min(realWidth, 41);
            const height = Math.floor(width * 0.7 * aspectRatio);

            console.log(`Scaling to ${width}x${height}`)

            convertImageInputLabel.textContent = "Converting Image ...";

            const canvas = new OffscreenCanvas(width, height);
            const context = canvas.getContext('2d');
            context.drawImage(img, 0, 0, width, height);
            //const imageData = context.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
            const imageData = context.getImageData(0, 0, width, height);
            editor.value += convertImageBlock(imageData);

            convertImageInputLabel.textContent = "Convert Image";
            convertImageInputLabel.classList.remove("disabled");
            convertImageInput.disabled = false;
            editor.disabled = false;
        };
        img.src = URL.createObjectURL(blob);
    }
    reader.readAsArrayBuffer(file);
}