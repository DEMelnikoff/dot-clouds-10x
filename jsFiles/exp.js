var exp = (function() {


    var p = {};

    const settings = {
        responseKeys: ['e', 'i'],
        signal: 10,
        zigWeight: [1, 10][Math.round(Math.random())],
        noise: 10,
        nDots: 100,
        nRounds: 5,
        breakLength: 10,
    };

    jsPsych.data.addProperties({
        signal: settings.signal,
        zigWeight: settings.zigWeight,
        noise: settings.noise,
        nDots: settings.nDots,
    });


   /*
    *
    *   INSTRUCTIONS
    *
    */

    const pages = {
        prePractice: [
            `<div class='parent'>
                <p>Welcome to Dot Detective!</p>
                <p>In Dot Detective, you'll see a series of grids. Each grid will contain <span style="color: red">red</span> dots and <span style="color: blue">blue</span> dots.
                <br>The number of dots will change over time.</p>
                <p>Sometimes, the average number of <span style="color: red">red</span> dots will be greater than the average number of <span style="color: blue">blue</span> dots.</p>
                <p>Other times, the average number of <span style="color: blue">blue</span> dots will be greater than the average number of <span style="color: red">red</span> dots.</p>
                <p><strong>Your job is to detect whether there are more <span style="color: red">red dots</span> or <span style="color: blue">blue dots</span> on average.</strong></p>
            </div>`,

            `<div class='parent'>
                <p>To get a feel for Dot Detective, you will complete a series of practice rounds.</p>
                <p>Continue when you are ready to begin practicing Dot Detective.</p>
            </div>`],

        postPractice: [
            `<div class='parent'>
                <p>Practice is now complete!</p>
                <p>Next, you will play ${settings.nRounds} rounds of Dot Detective.</p>
                <p>Continue to begin Round 1</p>
            </div>`],

        postTask: [
            `<div class='parent'>
                <p>Dot Detective is now complete!</p>
                <p>To finish this study, please continue to complete a few surveys.</p>
            </div>`]
    };

    p.prePractice = {
        type: jsPsychInstructions,
        pages: pages.prePractice,
        show_clickable_nav: true,
        post_trial_gap: 500,
    };

    p.postPractice = {
        type: jsPsychInstructions,
        pages: pages.postPractice,
        show_clickable_nav: true,
        post_trial_gap: 500,
    };

    p.postTask = {
        type: jsPsychInstructions,
        pages: pages.postTask,
        show_clickable_nav: true,
        post_trial_gap: 500,
    };

    
   /*
    *
    *   TASK
    *
    */

    let round = 0  // track current round
    
    const secondsLeft = arrayToList( (Array.from(Array(settings.breakLength).keys())).map((x) => settings.breakLength - x) )  // list of seconds remaining during breaks
    
    const factors = {
        drift: [settings.signal, -settings.signal],
        noise: [settings.noise],
        zigWeight: [settings.zigWeight],
        trialType: [].concat(Array(5).fill('normal'), ['zigZag', 'flatLine']),
        blockType: ['test'],
    };  // factors for making experimental design
    
    const factorsPractice = {
        drift: [settings.signal, -settings.signal],
        noise: [settings.noise],
        zigWeight: [settings.zigWeight],
        trialType: Array(5).fill('normal'),
        blockType: ['practice'],
    };  // factors for making practice block

    const design = jsPsych.randomization.factorial(factors, 3);  // experimental design

    
    const designPractice = jsPsych.randomization.factorial(factorsPractice, 1);  // experimental design for practice block

    // trials
    const probe = {
        type: jsPsychCanvasKeyboardResponse,
        stimulus: function(c) {
            console.log(jsPsych.timelineVariable('trialType'), jsPsych.timelineVariable('drift'), jsPsych.timelineVariable('zigWeight'));
            dots(c, jsPsych.timelineVariable('drift'), jsPsych.timelineVariable('zigWeight'), jsPsych.timelineVariable('noise'), jsPsych.timelineVariable('trialType'), settings.responseKeys, settings.nDots);
        },
        canvas_size: [600, 800],
        choices: settings.responseKeys,
        prompt: '<p>On average, on there more <span style="color: red">red</span> dots or <span style="color: blue">blue</span> dots?</p><p>Press <span style="color: red">"e" for red</span> and <span style="color: blue">"i" for blue</span>.</p>',
        data: {drift: jsPsych.timelineVariable('drift'), trialType: jsPsych.timelineVariable('trialType'), blockType: jsPsych.timelineVariable('blockType')},
        on_finish: function(data){
            data.round = round;
            if(jsPsych.timelineVariable('drift') > 0) {
                data.response == "i" ? data.correct = true : data.correct = false;
            } else {
                data.response == "i" ? data.correct = false : data.correct = true;
            };
            if(data.rt > 60000) { 
                jsPsych.data.addProperties({boot: true, bootReason: 'inactivity'});
                jsPsych.endExperiment("The experiment has ended early due to inactivity.");
            }
        },
    };

    const feedback = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function() {
            if(jsPsych.data.getLastTrialData().values()[0].correct) {
                return `<div style="font-size:60px">Correct!</div>`;
            } else {
                return `<div style="font-size:60px">Wrong!</div>`;
            }
        },
        choices: "NO_KEYS",
        trial_duration: 1000,
    };

    const clock = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function () {
            let html = `<div style="font-size:20px">
                <p>Thank you for playing Round ${round} of Dot Detective.
                <br>Round ${round + 1} will begin in:</p>
                <p><span style="color: red; font-size: 40px">${jsPsych.timelineVariable('toc')}</span> seconds.</p>
            </div>`;
            return html;
        },
        choices: "NO_KEYS",
        trial_duration: 1000,
    };

    // timelines
    const countdown = {
        timeline: [clock],
        timeline_variables: secondsLeft,
        conditional_function: function () {
            return settings.nRounds != round
        }
    };

    const trial = {
        timeline: [probe, feedback],
        randomize_order: true,
        timeline_variables: design,
        on_timeline_start: function() {
            round++
        },
    };

    p.practice = {
        timeline: [probe, feedback],
        randomize_order: true,
        timeline_variables: designPractice,
    };

    p.block = {
        timeline: [trial, countdown],
        repetitions: settings.nRounds,
        on_timeline_finish: () => {
            let mdn_rt = jsPsych.data.get().filter({round: round}).select('rt').median();
            console.log(mdn_rt);
            if (mdn_rt < 300) {
                jsPsych.data.addProperties({boot: true, bootReason: 'tooFast'});
                jsPsych.endExperiment("The experiment has ended early due to overly-fast responding.");
            }
        }
    };

   /*
    *
    *   QUESTIONS
    *
    */

    p.consent = {
        type: jsPsychExternalHtml,
        url: "./static/consent.html",
        cont_btn: "advance",
    };

    p.demographics = (function() {

        const taskComplete = {
            type: jsPsychInstructions,
            pages: [`<div class='parent' style='color: rgb(109, 112, 114)'>
                    <p>Dot detective is now complete!</p>
                    <p>To finish this study, please continue to a few final surveys.</p>
                    </div>`], 
            show_clickable_nav: true,
            post_trial_gap: 500,
            allow_keys: false,
        };

        const genFlowScale = ['-2<br>Totally<br>Disagree', '-1<br>Disagree', '0<br>Neither agree<br>nor disagree', '1<br>Agree', '2<br>Totally<br>Agree'];
        const flowProneScale = ['0<br>Never', '1<br>Rarely', '2<br>Sometimes', '3<br>Often', '4<br>Everyday, or almost everyday'];
        const nfcScale = ['-2<br>Extremely<br>Uncharacteristic', '-2<br>Somewhat<br>Uncharacteristic', '0<br>Uncertain', '1<br>Somewhat<br>Characteristic', '2<br>Extremely<br>Characteristic'];

        const flowGenQuestions = {
            type: jsPsychSurveyLikert,
            preamble:
                `<div style='padding-top: 50px; width: 900px; font-size:16px'>
                    <p>The following statements describe how you might perceive yourself. As every individual is unique, you may find some of the statements describe you well and some of them don't.</p>
                    <p>Please express the extent to which you disagree or agree with each statement. We appreciate your effort.</p>
                </div>`,
            questions: [
                {
                    prompt: `I enjoy challenging tasks/activities that require a lot of focus.`,
                    name: `genFlow_1`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `When I am focused on a task/activity, I quickly tend to forget my surroundings (other people, time, and place).`,
                    name: `genFlow_2`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `I usually experience a good flow when I do something (things that are neither too easy nor too difficult for me).`,
                    name: `genFlow_3`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `I have several different areas of interest.`,
                    name: `genFlow_4`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `It is difficult for me to walk away from or quit a project I am currently working on.`,
                    name: `genFlow_5`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `I become stressed in the face of difficult/challenging tasks.`,
                    name: `genFlow_6r`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `It is difficult for me to maintain concentration over time.`,
                    name: `genFlow_7r`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `I quickly become tired of the things I do.`,
                    name: `genFlow_8r`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `I am usually satisfied with the results of my efforts across various tasks (I experience feelings of mastery).`,
                    name: `genFlow_9`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `When I focus on something, I often forget to take a break.`,
                    name: `genFlow_10`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `I get bored easily.`,
                    name: `genFlow_11r`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `My daily tasks are exhausting rather than stimulating.`,
                    name: `genFlow_12r`,
                    labels: genFlowScale,
                    required: true,
                },
                {
                    prompt: `I develop and interest for most of the things I do in life.`,
                    name: `genFlow_13`,
                    labels: genFlowScale,
                    required: true,
                },
            ],
            randomize_question_order: false,
            scale_width: 500,
            on_finish: (data) => {
                saveSurveyData(data); 
            },
        };

        const flowProne_1 = {
            type: jsPsychSurveyLikert,
            preamble:
                `<div style='padding-top: 50px; width: 900px; font-size:16px'>
                    <p>When you are doing household work or other routine chores (e.g. cooking, cleaning, shopping)<br>how often does it happen that...</p>
                </div>`,
            questions: [
                {
                    prompt: `...you feel bored?`,
                    name: `flowProne_1`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...it feels as if your ability to perform what you do completely matches how difficult it is?`,
                    name: `flowProne_2`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...you have a clear picture of what you want to achieve, and what you need to do to get there?`,
                    name: `flowProne_3`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...you are conscious of how well or poorly you perform what you are doing?`,
                    name: `flowProne_4`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...you feel completely concentrated?`,
                    name: `flowProne_5`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...you have a sense of complete control?`,
                    name: `flowProne_6`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...what you do feels extremely enjoyable to do?`,
                    name: `flowProne_7`,
                    labels: flowProneScale,
                    required: true,
                },
            ],
            randomize_question_order: false,
            scale_width: 500,
            on_finish: (data) => {
                saveSurveyData(data); 
            },
        };

        const flowProne_2 = {
            type: jsPsychSurveyLikert,
            preamble:
                `<div style='padding-top: 50px; width: 900px; font-size:16px'>
                    <p>When you do something in your leisure time, how often does it happen that...</p>
                </div>`,
            questions: [
                {
                    prompt: `...you feel bored?`,
                    name: `flowProne_8`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...it feels as if your ability to perform what you do completely matches how difficult it is?`,
                    name: `flowProne_9`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...you have a clear picture of what you want to achieve, and what you need to do to get there?`,
                    name: `flowProne_10`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...you are conscious of how well or poorly you perform what you are doing?`,
                    name: `flowProne_11`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...you feel completely concentrated?`,
                    name: `flowProne_12`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...you have a sense of complete control?`,
                    name: `flowProne_13`,
                    labels: flowProneScale,
                    required: true,
                },
                {
                    prompt: `...what you do feels extremely enjoyable to do?`,
                    name: `flowProne_14`,
                    labels: flowProneScale,
                    required: true,
                },
            ],
            randomize_question_order: false,
            scale_width: 500,
            on_finish: (data) => {
                saveSurveyData(data); 
            },
        };

        const nfc = {
            type: jsPsychSurveyLikert,
            preamble:
                `<div style='padding-top: 50px; width: 900px; font-size:16px'>
                    <p>For each statement below, indicate how well it describes you.</p>
                </div>`,
            questions: [
                {
                    prompt: `I would prefer complex to simple problems.`,
                    name: `nfc_1`,
                    labels: nfcScale,
                    required: true,                    
                },
                {
                    prompt: `I like to have the responsibility of handling a situation that requires a lot of thinking.`,
                    name: `nfc_2`,
                    labels: nfcScale,
                    required: true,
                },
                {
                    prompt: `Thinking is not my idea of fun.`,
                    name: `nfc_3_r`,
                    labels: nfcScale,
                    required: true,
                },
                {
                    prompt: `I would rather do something that requires little thought than something that is sure to challenge my thinking abilities.`,
                    name: `nfc_4_r`,
                    labels: nfcScale,
                    required: true,
                },
                {
                    prompt: `I really enjoy a task that involves coming up with new solutions to problems.`,
                    name: `nfc_5`,
                    labels: nfcScale,
                    required: true,
                },
                {
                    prompt: `I would prefer a task that is intellectual, difficult, and important to one that is somewhat important but does not require much thought.`,
                    name: `nfc_6`,
                    labels: nfcScale,
                    required: true,
                },
            ],
            randomize_question_order: false,
            scale_width: 600,
            on_finish: (data) => {
                saveSurveyData(data); 
            },
        };

        const gender = {
            type: jsPsychSurveyHtmlForm,
            preamble: '<p>What is your gender?</p>',
            html: `<div style="text-align: left">
            <p>Male <input name="gender" type="radio" value="male"/></p>
            <p>Female <input name="gender" type="radio" value="female"/></p>
            <p>Other <input name="other" type="text"/></p>
            </div>`,
            on_finish: (data) => {
                data.gender = data.response.gender;
                data.gender_other = data.response.other;
            }
        };

        const age = {
            type: jsPsychSurveyText,
            questions: [{prompt: "Age:", name: "age"}],
            on_finish: (data) => {
                saveSurveyData(data); 
            },
        }; 

        const ethnicity = {
            type: jsPsychSurveyHtmlForm,
            preamble: '<p>What is your race / ethnicity?</p>',
            html: `<div style="text-align: left">
            <p>White / Caucasian <input name="ethnicity" type="radio" value="white"/></p>
            <p>Black / African American <input name="ethnicity" type="radio" value="black"/></p>
            <p>East Asian (e.g., Chinese, Korean, Vietnamese, etc.) <input name="ethnicity" type="radio" value="east-asian"/></p>
            <p>South Asian (e.g., Indian, Pakistani, Sri Lankan, etc.) <input name="ethnicity" type="radio" value="south-asian"/></p>
            <p>Latino / Hispanic <input name="ethnicity" type="radio" value="hispanic"/></p>
            <p>Middle Eastern / North African <input name="ethnicity" type="radio" value="middle-eastern"/></p>
            <p>Indigenous / First Nations <input name="ethnicity" type="radio" value="indigenous"/></p>
            <p>Bi-racial <input name="ethnicity" type="radio" value="indigenous"/></p>
            <p>Other <input name="other" type="text"/></p>
            </div>`,
            on_finish: (data) => {
                data.ethnicity = data.response.ethnicity;
                data.ethnicity_other = data.response.other;
            }
        };

        const english = {
            type: jsPsychHtmlButtonResponse,
            stimulus: '<p>Is English your native language?:</p>',
            choices: ['Yes', 'No'],
            on_finish: (data) => {
                data.english = data.response;
            }
        };  

        const finalWord = {
            type: jsPsychSurveyText,
            questions: [{prompt: "Questions? Comments? Complains? Provide your feedback here!", rows: 10, columns: 100, name: "finalWord"}],
            on_finish: (data) => {
                saveSurveyData(data); 
            },
        }; 

        const demos = {
            timeline: [flowGenQuestions, flowProne_1, flowProne_2, nfc, gender, age, ethnicity, english, finalWord]
        };

        return demos;

    }());


    return p;

}());


// create timeline
const timeline = [
    exp.consent, 
    exp.prePractice, 
    exp.practice, 
    exp.postPractice, 
    exp.block, 
    exp.postTask, 
    exp.demographics, 
    save_data];

// initiate timeline
jsPsych.run(timeline);

