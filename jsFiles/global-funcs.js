const completionCode = "5665C3A9";

const jsPsych = initJsPsych({
    on_finish: () => {
        if(!jsPsych.data.get().select('boot').values[0]) {
            document.body.innerHTML = 
                `<div align='center' style="margin: 10%">
                    <p>Thank you for participating!<p>
                    <b>You will be automatically re-directed to Prolific in a few moments.</b>
                </div>`;
            setTimeout(() => { 
                location.href = `https://app.prolific.co/submissions/complete?cc=${completionCode}`
            }, 2000);
        };
    },
});

let subject_id = jsPsych.data.getURLVariable("PROLIFIC_PID");
if (!subject_id) { subject_id = jsPsych.randomization.randomID(10) };

jsPsych.data.addProperties({
    subject_id: subject_id,
});

const filename = `${subject_id}.csv`;

const save_data = {
    type: jsPsychPipe,
    action: "save",
    experiment_id: "EcXUw8IlQEss",
    filename: filename,
    data_string: ()=>jsPsych.data.get().csv()
};

const saveSurveyData = (data) => {
    const names = Object.keys(data.response);
    const values = Object.values(data.response);
    for(let i = 0; i < names.length; i++) {
        data[names[i]] = values[i];
    };      
};

function arrayToList(array) {
    let list = Array(array.length);
    for (let i = array.length - 1; i >= 0; i--) {
        list[i] = { toc: array[i] };
    }
    return list;
}

const dots = function(c, signal, zigWeight, noise, trialType, responseKeys, nDots) {
    const canvasWidth = c.width;
    const canvasHeight = c.height;
    const ctx = c.getContext('2d');
    const xMin = canvasWidth * .30;
    const xMax = canvasWidth * .70;
    const yMin = (canvasHeight - xMax + xMin) / 2;
    const yMax = (canvasHeight + xMax - xMin) / 2;
    const nX = 40;
    const nY = nX;
    const rad = 2;
    const xSpace = ((xMax - xMin) / nX) - 2*rad;
    const ySpace = ((yMax - yMin) / nY) - 2*rad;
    const pos = {
        xPos: Array.from(Array(nX + 1).keys(), i => xMin + i * (2*rad + xSpace)),
        yPos: Array.from(Array(nY + 1).keys(), i => yMin + i * (2*rad + ySpace)),
    };
    const posFactorial = jsPsych.randomization.factorial(pos, 1, true);
    const idx = Array.from({length: posFactorial.xPos.length}, (item, index) => index);
    let zig = [0, 2][Math.floor(Math.random() * 2)];
    let zigVec = [0, .5, 0, -.5];
    if (signal < 0) {
        zigVec = zigVec.map((x) => x * -1);
    }
    let n1 = 0;
    let n2 = 0;
    console.log(zigVec);

    function drawCircle(ctx, x, y, radius, fill, stroke, strokeWidth) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        };
        if (stroke) {
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = stroke;
            ctx.stroke();
        };
    };

    function gaussianRandom(mean, stdev) {
        let x = -1;
        while(x < 1) {
            let u = 1 - Math.random(); // Converting [0,1) to (0,1]
            let v = Math.random();
            let z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
            x = Math.floor(z * stdev + mean);
        };
        return x;
    };

    function randomDots() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clean up
        let randIdx = jsPsych.randomization.repeat(idx, 1);
        let n1 = gaussianRandom(nDots - (signal/2), noise);
        let n2 = gaussianRandom(nDots + (signal/2), noise);
        for(i = 0; i < n1; i++) {
            let xPos1 = posFactorial.xPos[randIdx[i]];
            let yPos1 = posFactorial.yPos[randIdx[i]];
            drawCircle(ctx, xPos1, yPos1, rad, 'red', 'red', 2);
        };
        for(i = n1; i < (n1 + n2); i++) {
            let xPos2 = posFactorial.xPos[randIdx[i]];
            let yPos2 = posFactorial.yPos[randIdx[i]];
            drawCircle(ctx, xPos2, yPos2, rad, 'blue', 'blue', 2);
        };
    };

    const id = setInterval(() => {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clean up
        let randIdx = jsPsych.randomization.repeat(idx, 1);
        if (trialType == 'zigZag') {
            n1 = nDots - (signal*zigVec[zig]*zigWeight);
            n2 = nDots + (signal*zigVec[zig]*zigWeight);
        } else if (trialType == 'flatLine') {
            n1 = nDots;
            n2 = nDots;
        } else {
            n1 = gaussianRandom(nDots - (signal/2), noise);
            n2 = gaussianRandom(nDots + (signal/2), noise); 
        };
        for(i = 0; i < n1; i++) {
            let xPos1 = posFactorial.xPos[randIdx[i]];
            let yPos1 = posFactorial.yPos[randIdx[i]];
            drawCircle(ctx, xPos1, yPos1, rad, 'red', 'red', 2);
        };
        for(i = n1; i < (n1 + n2); i++) {
            let xPos2 = posFactorial.xPos[randIdx[i]];
            let yPos2 = posFactorial.yPos[randIdx[i]];
            drawCircle(ctx, xPos2, yPos2, rad, 'blue', 'blue', 2);
        };
        zig++;
        if (zig == zigVec.length) { zig = 0 };
    }, 100);


    addEventListener("keydown", (e) => {
        if (responseKeys.includes(e.key)) {
            clearInterval(id);
        }
    })

};