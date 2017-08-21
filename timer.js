var timerBackgroundColor = "deepskyblue";

var workout = []; // array of on/off intervals, where each element is [duration, 1/0] where 1 is active, 0 is rest
var oldWorkout = [];
var excludeFinalRest = false; // boolean of whether to exclude final rest period
var restChoice = 0; // rest choice of 0 (equal), 1 (custom), or 2 (none)
var noFinalRest = []; // workout without final rest period
var oldShortWorkout = []; // old workout without final rest period
var finalRestChange = 0; //boolean of whether last change was just in/excluding final rest
var fullWorkout = []; //workout with final rest period
var displayedWorkout = [];
var restChoice;
var workoutMin = 0; // full minutes of workout
var workoutSec = 0; // residual seconds of workout
var totalSec = 0; // workout duration in seconds
var countdownSec = 0;
var newWorkout = []; // workout remade in timer page
var changeTimes = []; // values of counter when new interval starts

var workoutName;
var savedWorkouts = {
    "8 1-Minute Intervals": [[60,1], [60,0], [60,1], [60,0], [60,1], [60,0], [60,1], [60,0], [60,1], [60,0], [60,1], [60,0], [60,1], [60,0], [60,1], [60,0]],
    "45 on, 15 off (4 min)": [[45,1], [15, 0], [45,1], [15, 0], [45,1], [15, 0], [45,1], [15, 0]],
    "Eight Minute Abs": [[45,1],[45,1],[45,1],[45,1],[45,1],[45,1],[45,1],[45,1],[45,1],[45,1],[30,1]],
};
var savedWorkoutNames = {
    "8 1-Minute Intervals": "8 1-Minute Intervals",
    "45 on, 15 off (4 min)": "45 on, 15 off (4 min)",
    "Eight Minute Abs": "Eight Minute Abs",
};

// -------- in timer ---------
var elapsed = true; // boolean for whether elapsed (true) or remaining (false) time shows
var secondCounter; // initialize the counter at total duration (counts down)
var initialSC; // secondCounter at beginning of each interval
var secRemaining; // difference between current SC value and ending SC value
var justBegan; // boolean to know whether to set initialSC in current iteration (1x per interval)

var subIntervalCounter = 0; // increments "colorUpdateFrequency" times per second to update color
var colorUpdateFrequency = 100; // color updates per second

var iInt; // index determining which workout interval is starting (and consequently, currently going on)
var started; // boolean encoding whether timer is running
var isPaused; // boolean for whether timer is paused
var changeColor = true; // do the cool color change thing?

// ------------------------------ end global variables ------------------------------

function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this,
            args = arguments;
        var later = function() {
            timeout = null;
            if ( !immediate ) {
                func.apply(context, args);
            }
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if ( callNow ) { 
            func.apply(context, args);
        }
    };
};

function resizeFunction() {
    // console.log("running resizeFunction");
    var saveButton = document.getElementById("workoutSave");
    var loadButton = document.getElementById("workoutLoad");
    var deleteButton = document.getElementById("workoutDelete");

    var equal = document.getElementById("equalRest");
    var custom = document.getElementById("customRest");
    var none = document.getElementById("noneRest");

    var ctdwn = document.getElementById("countdownButton");

    var ctdwnLabel = document.getElementById("countdownLabel");

    if (window.innerWidth < 600) {
        saveButton.innerHTML = "Save";
        loadButton.innerHTML = "Load";
        deleteButton.innerHTML = "Delete";

        equal.innerHTML = "Equal";
        custom.innerHTML = "Custom";
        none.innerHTML = "None";

        ctdwn.innerHTML = "Countdown?";
        ctdwnLabel.innerHTML = "sec";
    }
    else {
        saveButton.innerHTML = "Save Workout";
        loadButton.innerHTML = "Load Workout";
        deleteButton.innerHTML = "Delete Workout";

        equal.innerHTML = "Equal Rest";
        custom.innerHTML = "Custom Rest";
        none.innerHTML = "No Rest";

        ctdwn.innerHTML = "Countdown to Start?";
        ctdwnLabel.innerHTML = "seconds";
    }

    var min = document.getElementsByClassName("minField");
    var sec = document.getElementsByClassName("secField")

    if (window.innerWidth <= 350) {
        min[0].innerHTML = "Min:"
        min[1].innerHTML = "Min:"

        sec[0].innerHTML = "Sec:"
        sec[1].innerHTML = "Sec:"
    }
    else {
        min[0].innerHTML = "Minutes:"
        min[1].innerHTML = "Minutes:"

        sec[0].innerHTML = "Seconds:"
        sec[1].innerHTML = "Seconds:"
    }
}


function resizeTimer() {
    var contentHeight = document.getElementById("bodyContainer").offsetHeight;
    var windowHeight = window.innerHeight;
    var timerButton = document.getElementById("timerButton");

    // timerButton.style.height = "auto";

    var space = windowHeight - (contentHeight+20);

    var newHeight = (timerButton.offsetHeight  + 4 + space > .16 * window.innerWidth
        ? timerButton.offsetHeight + 4  + space : .16 * window.innerWidth);

    timerButton.style.height = newHeight.toString() + "px";

}

function selectContentString(min, max) {
    var selectHTML = '';
    for (var i = min; i <= max; i++) {
        selectHTML += '<option value="' + i + '">' + i + '</option>' + '\n';
    }
    return selectHTML;
}

function renderNumberInputs() {
    document.getElementById("activeMin").innerHTML = selectContentString(0,60);
    document.getElementById("restMin").innerHTML = selectContentString(0,60);
    document.getElementById("activeSec").innerHTML = selectContentString(0,59);
    document.getElementById("restSec").innerHTML = selectContentString(0,59);
    document.getElementById("addRepetitions").innerHTML = selectContentString(1,99);
    document.getElementById("countdownSec").innerHTML = selectContentString(1,10);
}

function assessRest(setting){
    var restOps = document.getElementById("restOptions").children;
    restChoice = setting;
    // console.log(restOps);
    for (var i = 0; i < restOps.length; i++) {
        if (setting == i) {
            restOps[i].className = "radioButtonSelected";
        }
        else {
            restOps[i].className = "radioButton";
        }
    }

    disableRestEntry((setting != 1));
}

function disableRestEntry(disable){
    var restInps = document.getElementsByClassName("restTimeInput");
    for (var i = 0; i < restInps.length; i++) {restInps[i].disabled = disable;} // disable if appropriate
    
    var newclass;
    if (disable) {newclass = "disabledField";} else {newclass = "radioField";}

    document.getElementById("restMinBox").className = newclass;
    document.getElementById("restSecBox").className = newclass;
}

function assessCountdown(){
    var ctdwnButton = document.getElementById("countdownButton");

    var ctdwnInputBox = document.getElementById("countdownInputBox");

    // console.log(ctdwnButton.className=="radioButton");

    var ctdwnInput = document.getElementById("countdownSec");
    var ctdwnLabel = document.getElementById("countdownLabel");
    // console.log(ctdwnLabel);
    if (ctdwnButton.className == "radioButton"){
        ctdwnButton.className = "radioButtonSelected";
        ctdwnInputBox.className = "radioField";
        ctdwnInput.disabled = false;
    }
    else if (ctdwnButton.className == "radioButtonSelected"){
        ctdwnButton.className = "radioButton";
        ctdwnInputBox.className = "disabledField";
        ctdwnInput.disabled = true;
    }
    // console.log(ctdwnButton.className=="radioButton");
}

function cleanAdder() {
    var secTimes = [document.getElementById("activeSec"), document.getElementById("restSec")]
    var minTimes = [document.getElementById("activeMin"), document.getElementById("restMin")]
    for (var i = 0; i < secTimes.length; i++) {
        if (secTimes[i].value == ""){secTimes[i].value = 0;}
        else if (parseInt(secTimes[i].value) < 0){secTimes[i].value = 0;}
        else if (parseInt(secTimes[i].value) > 59){secTimes[i].value = 59;}
    }
    for (var i = 0; i < minTimes.length; i++) {
        if (minTimes[i].value == ""){minTimes[i].value = 0;}
        else if (parseInt(minTimes[i].value) < 0){minTimes[i].value = 0;}
    }
    var reps = document.getElementById("addRepetitions");
    if (reps.value == ""){reps.value = 1;}
    else if (parseInt(reps.value) < 1) {reps.value = 1;}
    var ctdwn = document.getElementById("countdownSec");
}


function addInterval() {
    cleanAdder();

    workout = fullWorkout.slice(0);

    var activeTime = 60 * parseInt(document.getElementById("activeMin").value) + parseInt(document.getElementById("activeSec").value);
    
    var restTime;
    switch (restChoice) {
        case 0:
            restTime = activeTime;
            break;
        case 1:
            restTime = 60 * parseInt(document.getElementById("restMin").value) + parseInt(document.getElementById("restSec").value);
            break;
        case 2:
            restTime = 0;
            break;
        default:
            console.error("Got input other than 0,1,2 for rest setting!");
            restTime = 0;
    }
    // console.log(activeTime);
    // console.log(restTime);
    var reps = document.getElementById("addRepetitions").value;

    if (activeTime + restTime == 0) {
        sweetAlert("No interval entered!");
    }
    else if (reps < 1) {
        sweetAlert("Cannot have less than 1 interval!");
    }
    else {
        oldWorkout = workout.slice(0);
        oldShortWorkout = noFinalRest.slice(0);
        // console.log(oldWorkout);
        
        for (var i = 0; i < reps; i++) {
            if (activeTime > 0){
                workout.push([activeTime, 1]);
            }
            if (restTime>0){
                workout.push([restTime, 0]);
            }
        }

        fullWorkout = workout.slice(0);

        if (workout.slice(-1)[0][1] == 0){
            noFinalRest = workout.slice(0,-1);
        }
        else {noFinalRest = workout.slice(0);}
        // console.log(noFinalRest);
        updateSummary();
        document.getElementById("undoButton").disabled = false;
        document.getElementById("undoButton").style.cssText = "filter: blur(0px);";
    }
}

function undoAdd() {
    // var intDiv;
    // for (var i = oldWorkout.length; i < workout.length; i++) {
    //     intDiv = document.getElementById("int" + i);
    //     intDiv.parentNode.removeChild(intDiv);
    // }
    fullWorkout = oldWorkout;
    noFinalRest = oldShortWorkout;
    updateSummary();
    document.getElementById("undoButton").disabled = true;
    document.getElementById("undoButton").style.cssText = "filter: blur(2px);";
}

function assessFinalRest() {
    var finalRestButton = document.getElementById("finalRestCheck");

    if (finalRestButton.className == "radioButton") {
        excludeFinalRest = true;
        finalRestButton.className = "radioButtonSelected";
    }
    else if (finalRestButton.className == "radioButtonSelected") {
        excludeFinalRest = false;
        finalRestButton.className = "radioButton";
    }

    updateSummary();
}

function updateSummary(){
    if (!excludeFinalRest) {
        workout = fullWorkout.slice(0);
        // lastIntDiv = document.getElementById("int" + (fullWorkout.length-1));
        // lastIntDiv.style.cssText = "visibility: hidden;";
    }
    else if (excludeFinalRest) {
        if ((noFinalRest.length == 0) && (fullWorkout.length != 0)) {
            if (fullWorkout.slice(-1)[0][1] == 0){
                noFinalRest = workout.slice(0,-1);
            }
            else {noFinalRest = fullWorkout.slice(0);}
        }
        workout = noFinalRest.slice(0);
        // lastIntDiv = document.getElementById("int" + (fullWorkout.length-1));
        // lastIntDiv.style.cssText = "visibility: visible;";
    }

    // console.log("Workout");
    // console.log(workout);
    // console.log("Full Workout");
    // console.log(fullWorkout);
    // console.log("Shortened Workout");
    // console.log(noFinalRest);

    totalSec = 0;
    for (var i = 0; i < workout.length; i++) {
        totalSec += workout[i][0];
    }
    workoutSec = totalSec%60;
    workoutMin = (totalSec - workoutSec)/60;

    var durationString = "Total Duration:<br>" + workoutMin + "&nbsp;minutes, " + workoutSec + "&nbsp;seconds";
    document.getElementById("innerDurationDiv").innerHTML = durationString;

    var bar = document.getElementById("summaryBar");
    var countDivs = bar.childNodes.length;

    var intDiv;

    if (countDivs < workout.length) {
        for (var i = countDivs; i < workout.length; i++) {
            intDiv = document.createElement("div");
            intDiv.id = "int" + i;
            intDiv.class = "intervalBar";
            intDiv.style.height = "100%";
            bar.appendChild(intDiv);
        }
    }

    if (workout.length < countDivs) {
        for (var i = workout.length; i < countDivs; i++) {
            intDiv = document.getElementById("int" + i);
            intDiv.parentNode.removeChild(intDiv);
        }
    }

    // console.log(oldWorkout.length);
    // console.log(workout.length);

    // for (var i = oldWorkout.length; i < workout.length; i++) {
    //     intDiv = document.createElement("div");
    //     intDiv.id = "int" + i;
    //     intDiv.style.height = "100%";
    //     bar.appendChild(intDiv);
    // }

    var pct;
    var intcolor;
    for (var i = 0; i < workout.length; i++) {
        pct = (workout[i][0] / totalSec) * 100;
        if (workout[i][1] == 1) {intcolor = "lime"} else if (workout[i][1] == 0) {intcolor = "red"}
        intDiv = document.getElementById("int" + i);
        if (i==0) {
            intDiv.style.width = pct + "%";
        }
        else {
            intDiv.style.width = "calc(" + pct + "% - 1px)";
            intDiv.style.borderLeft = "1px solid black";
        }
        // intDiv.style.width = pct + "%";
        intDiv.style.backgroundColor = intcolor;
        // if (i!=0){
        //     if ((workout[i][1] == 1) && (workout[i-1][1] == 1)) {
        //         console.log("Gotta put a black line at the left of int " + i);
        //         intDiv.style.width = "calc(" + pct + "%" + " - 1px)";
        //         intDiv.style.cssText = "border: 0 0 0 1px black;";
        //     }
        // }
        // intDiv.style.cssText = "border: solid black 0 1px;";
        
        intDiv.style.display = "inline-block";
        intDiv.style.zIndex = 1;
    }
    // console.log(workout);
    // console.log(oldWorkout);
}

function toTimer() {
    var countdown = document.getElementById("countdownButton");
    var ctdwnInput = document.getElementById("countdownSec");
    if (countdown.className == "radioButtonSelected"){
        countdownSec = parseInt(ctdwnInput.value);
    }
    else {
        countdownSec = 0;
    }
    if (workout.length == 0){
        sweetAlert("No workout entered!\nPlease enter a workout.");
    }
    else {
        sessionStorage.setItem("workoutMin", workoutMin);
        sessionStorage.setItem("workoutSec", workoutSec);
        sessionStorage.setItem("workout", workout);
        sessionStorage.setItem("countdownSec", countdownSec);
        window.location.href = "timer-screen.html";
    }
}

function getWorkout() {
    try {
        var rawWorkout = (sessionStorage.workout).split(",");

        var int;
        var i=0;
        while (i < rawWorkout.length/2) {
            int = [];
            for (var j = 0; j < 2; j++) {
                int.push(parseInt(rawWorkout[2*i+j]));
            }
            // console.log(int);
            newWorkout.push(int);
            i++;
        }
        // console.log(newWorkout);
        countdownSec = parseInt(sessionStorage.countdownSec);
        var sum = countdownSec;
        for (var i = 0; i < newWorkout.length; i++) {
            sum = sum + newWorkout[i][0];
        }
        totalSec = sum;
        // console.log(totalSec);
        var t = totalSec;
        if (countdownSec > 0) {
            t = t - countdownSec;
        }
        changeTimes.push(t);

        for (var i = 0; i < newWorkout.length - 1; i++) {
            t = t - newWorkout[i][0];
            changeTimes.push(t);
        }
    }
    catch (TypeError) {
        document.getElementById("totalTimeLeft").innerHTML = "No Workout!";
        swal({
            title: "No Workout!",
            text: "Please begin by creating or loading a workout.",
            showCancelButton: false,
            confirmButtonText: "Make Workout"
            },
            function() {
                window.location.href = "index.html";
            });
    }
    // console.log(rawWorkout);
    // newWorkout = [];

    // console.log(changeTimes);
}

function switchElapsed() {
    if (secondCounter <= changeTimes[0]) {
        var totalDiv = document.getElementById("totalTimeLeft");
        var currentTimeString = totalDiv.innerHTML.split(" ")[1];
        var newTimeString = changeTimes[0] - timeString2sec(currentTimeString);
        if (elapsed) {
            totalDiv.innerHTML = "Remaining: " + sec2time(newTimeString);
            elapsed = false; // show remaining
        }
        else {
            totalDiv.innerHTML = "Elapsed: " + sec2time(newTimeString);
            elapsed = true; // show elapsed
        }
    }
}


function timerButtonPress() {
    // console.log(started);
    if (started == 0) {
        startTimer();
        started = 1;
    }
    else {
        isPaused = 1;
        showPauseScreen();
    }
}

function startTimer() {
    // console.log(newWorkout);

    var timerButton = document.getElementById("timerButton");
    var totalDiv = document.getElementById("totalTimeLeft");

    var screen = document.getElementById("bodyContainer");

    secondCounter = totalSec; //initialize the counter at total duration (counts down)

    //justBegain - boolean to know whether to set initialSC in current iteration (1x per interval)
    justBegan = 1;

    var onScreenString;
    var buttonColor = ["red", "lime"];

    var screenColor;
    var colorChanger;
    var intraSecondPct;



    iInt = 0; // index determining which workout interval is starting (and consequently, currently going on)

    var onIntervalPct;

    function updateColor() {
        intraSecondPct = subIntervalCounter/colorUpdateFrequency;

        onIntervalPct = 1 - ((secRemaining - intraSecondPct) / newWorkout[iInt][0]);

        // console.log(onIntervalPct);

        screenColor = green2redColorString(Math.round(510 * onIntervalPct));
        // console.log(subIntervalCounter/colorUpdateFrequency);
        // console.log(onIntervalPct);
        screen.style.backgroundColor = screenColor;
        timerButton.style.backgroundColor = screenColor;
    }

    function runMasterTimer(argument) {

        if (subIntervalCounter % colorUpdateFrequency == 0) {
            if (secondCounter > 0){
                // console.log(secondCounter);
                if (!isPaused) {
                    // console.log(secondCounter);
                    if (changeTimes.indexOf(secondCounter) != -1){ //check if new interval just started
                        iInt = changeTimes.indexOf(secondCounter);
                        timerButton.style.backgroundColor = buttonColor[newWorkout[iInt][1]];
                        screen.style.backgroundColor = buttonColor[newWorkout[iInt][1]];
                        justBegan = 1;
                        
                        // console.log("New Interval");
                        secRemaining = newWorkout[iInt][0];
                    }
                    // console.log(secondCounter);
                    doEvent();
                    secondCounter = secondCounter - 1;
                }
                // console.log(secRemaining);
            }
            else {
                window.clearInterval(masterTimer);
                workoutFinished();
            }
        }

        if (changeColor) {
            if ((secondCounter < changeTimes[0]) && (secondCounter > 0)) {
                if (newWorkout[iInt][1] == 1)  {
                    updateColor();
                }
            }
        }
        // console.log(subIntervalCounter);

        if (!isPaused) {
            subIntervalCounter += 1;
        }
        
    }

    function doEvent() {
        // console.log(changeTimes);
        // console.log(secondCounter);
        if (secondCounter > changeTimes[0]) { // execute if during countdown
            if (justBegan == 1) {
                initialSC = secondCounter;
                justBegan = 0;
                timerButton.style.backgroundColor = "darkviolet";
            }
            secRemaining = secondCounter - (initialSC - countdownSec);
            onScreenString = secRemaining.toString();
            countdownSound.play();
        }
        else { // execute if secondCounter is lower than first interval start time (i.e. actual workout has begun)

            // console.log(secondCounter);
            // console.log(changeTimes);

            if (justBegan == 1) {
                initialSC = secondCounter;
                // console.log(initialSC);

                justBegan = 0;
                if (newWorkout[iInt][1] == 1) { // active interval begins
                    onIntervalPct = 0;
                    onScreenString = activeIntervalStart();
                }
                else { // rest interval begins
                    onScreenString = restIntervalStart();
                }
            }
            else {
                secRemaining = secondCounter - (initialSC - newWorkout[iInt][0]);
                onScreenString = sec2time(secRemaining);

                if ((secRemaining < 4) && (secRemaining > 0)) {
                    countdownSound.play();
                }
            }


            if (elapsed) {
                totalDiv.innerHTML = "Elapsed: " + sec2time(changeTimes[0] - secondCounter);
            }
            else {
                totalDiv.innerHTML = "Remaining: " + sec2time(secondCounter);
            }

            // console.log(newWorkout[iInt]);
            subIntervalCounter = 0;

            // if (changeColor) {
            //     if (newWorkout[iInt][1] == 1) {
            //         // colorChanger = window.setInterval(updateColor, 1000/colorUpdateFrequency);
            //         onIntervalPct = 1 - (secRemaining / newWorkout[iInt][0]);
            //         screenColor = green2redColorString(Math.round(510 * onIntervalPct))
            //         screen.style.backgroundColor = screenColor;
            //         timerButton.style.backgroundColor = screenColor;
            //     }
            // }

        }
        timerButton.innerHTML = onScreenString;

    }
    isPaused = 0;
    var masterTimer = window.setInterval(runMasterTimer, 1000/colorUpdateFrequency);
}

function activeIntervalStart() {
    startSound.play();

    return "Go!";
}

function restIntervalStart() {
    doneSound.play();

    return "Rest!";
}

function workoutFinished() {
    var timerButton = document.getElementById("timerButton");
    var totalDiv = document.getElementById("totalTimeLeft");
    var screen = document.getElementById("bodyContainer");

    if (elapsed) {
        totalDiv.innerHTML = "Elapsed: " + sec2time(changeTimes[0]);
    }
    else {
        totalDiv.innerHTML = "Remaining: " + sec2time(0);
    }

    timerButton.style.backgroundColor = timerBackgroundColor;
    screen.style.backgroundColor = timerBackgroundColor;

    timerButton.innerHTML = "Finished!";

    clapSound.play();
}

function sec2time(n) {
    var s = n % 60;
    var m = (n - s)/60;
    var timeString = m.toString() + ":" + (("0" + s).toString()).slice(-2);
    return timeString;
}

function timeString2sec(s) {
    var splitString = s.split(":");
    var min = parseInt(splitString[0]);
    var sec = parseInt(splitString[1]);
    return (60*min + sec);
}

function green2redColorString(n) {
    var s;
    if ((n < 0) || (n > 510)){
        console.error("Green to red number must be in (0, 510)!")
    }
    else if ((n >= 0) && (n <= 255)){
        s = "rgb(" + n + ",255,0)";
    }
    else if ((n > 255) && (n <= 510)){
        s = "rgb(255," + (510 - n) + ",0)";
    }
    return s;
}


function backToAdder() {
    sweetAlert({title: "Are you sure?", text: "You will be forced to reenter timer!", type: "warning",
        showCancelButton: true, confirmButtonColor: "#DD6B55", confirmButtonText: "Go Back", closeOnConfirm: false
    },
    function (){
        window.location.href = "index.html";
    });
}

var swalFunction = function () {
    swal({
        title: "Workout Paused",
        text: "What would you like to do?",
        type: "warning",
        showCancelButton: false,
        confirmButtonColor: "red",
        confirmButtonText: "Go Back",
        closeOnConfirm: true
    },
        function () {
            window.location.href = "index.html";
        });
};

function showPauseScreen() {
    swalExtend({
        swalFunction: swalFunction,
        hasCancelButton: false, // change to true if problems
        buttonNum: 2,
        buttonColor: ["blue", "green"],
        buttonNames: ["Restart", "Resume"],
        showCancelButton: false,
        clickFunctionList: [
            function () {
                window.location.href = "timer-screen.html";
            },
            function () {
                swal({
                    title: "Get Ready!",
                    text: "Resuming in 3 seconds...",
                    timer: 3000,
                    showConfirmButton: false
                });
                isPaused = 0;
            }
        ]
    });
};

// function setCookie(cname, cvalue) {
//     document.cookie = cname + "=" + cvalue + ";path=/";
// }

// function getCookie(cname) {
//     var name = cname + "=";
//     var decodedCookie = decodeURIComponent(document.cookie);
//     var ca = decodedCookie.split(';');
//     for(var i = 0; i <ca.length; i++) {
//         var c = ca[i];
//         while (c.charAt(0) == ' ') {
//             c = c.substring(1);
//         }
//         if (c.indexOf(name) == 0) {
//             return c.substring(name.length, c.length);
//         }
//     }
//     return "";
// }

var markedWorkout;
label = "timerWorkoutFormat"

function saveWorkout() {
    if (workout.length > 1) {
        swal({
            title: 'Save Workout',
            input: 'text',
            showCancelButton: true,
            reverseButtons: true,
            inputValidator: function (value) {
                return new Promise(function (resolve, reject) {
                    if (value) {
                        resolve()
                    } else {
                        reject('You need to write something!')
                    }
                })
            }
        }).then(function (result) {

            workoutName = result;
            markedWorkout = workout.slice(0);
            markedWorkout.unshift(label);
            localStorage.setItem(workoutName, markedWorkout);

            swal({
                type: 'success',
                html: 'Workout saved as "' + result + '".',
            })
        }).catch(swal.noop);
    }
    else {
        sweetAlert("No workout entered!");
    }
}

var storedItem;
var storedArrayStrings;
var storedArrayInts;
var storedWorkout;

function getSavedWorkouts () {
    if (localStorage.length > 0) {
        for (var i = 0; i < localStorage.length; i++){
            storedItem = localStorage.getItem(localStorage.key(i));

            if (typeof(storedItem) == "string") {
                storedArrayStrings = storedItem.split(",");
                if (storedArrayStrings[0] == label) {
                    storedArrayStrings.shift();
                    storedArrayInts = storedArrayStrings.map(Number);
                    storedWorkout = [];

                    for (var j = 0; j < storedArrayInts.length; j=j+2) {
                        storedWorkout.push([storedArrayInts[j],storedArrayInts[j+1]]);
                    }


                    savedWorkouts[localStorage.key(i)] = storedWorkout;
                    savedWorkoutNames[localStorage.key(i)] = localStorage.key(i);
                }
            }
        }
    }
}

function loadWorkout() {
    getSavedWorkouts();
    if (Object.keys(savedWorkouts).length > 0) {
        swal({
            title: 'Load Saved Workout',
            input: 'select',
            inputOptions: savedWorkoutNames,
            inputPlaceholder: 'Select Workout',
            showCancelButton: true,
            confirmButtonText: "Load",
            reverseButtons: true,
            inputValidator: function (value) {
                return new Promise(function (resolve, reject) {
                    if (value != '') {
                        fullWorkout = savedWorkouts[value].slice(0);
                        updateSummary();
                        resolve();
                    } else {
                        reject('Select a workout to load!');
                    }
                })
            }
        }).then(function (result) {
            // swal({
            //     type: 'success',
            //     html: 'Workout "' + result + '" loaded.',
            // });

        }).catch(swal.noop);
    }
    else {
        sweetAlert("No workouts to load!");
    }
}

var toBeDeleted;

function deleteWorkout() {
    getSavedWorkouts();
    if (Object.keys(savedWorkouts).length > 0) {
        swal({
            title: 'Delete Saved Workout',
            input: 'select',
            inputOptions: savedWorkoutNames,
            inputPlaceholder: 'Select Workout',
            showCancelButton: true,
            confirmButtonText: "Delete",
            reverseButtons: true,
            inputValidator: function (value) {
                return new Promise(function (resolve, reject) {
                    if (value != '') {
                        toBeDeleted = value;
                        resolve();
                    } else {
                        reject('Select a workout to delete!');
                    }
                })
            }
        }).then(function (result) {
            swal({
                type: 'warning',
                html: 'Are you sure you want to delete "' + toBeDeleted + '" ?',
                showCancelButton: true,
                reverseButtons: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Delete'
            }).then(function () {
                localStorage.removeItem(toBeDeleted);
                delete savedWorkoutNames[toBeDeleted];
                delete savedWorkouts[toBeDeleted];
            }).catch(swal.noop);

        }).catch(swal.noop);
    }
    else {
        sweetAlert("No workouts to delete!");
    }
}




