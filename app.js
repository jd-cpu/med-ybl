/* ==============================================
   0. 버전 관리 (업데이트 시 이것만 바꾸세요!)
   ============================================== */
// 👇 데이터를 수정하거나 문제를 추가하면 이 숫자를 바꾸세요! (예: "1.0" -> "1.1")
const APP_VERSION = "1.0"; 


/* ==============================================
   1. 데이터 및 전역 변수
   ============================================== */
let allQuestions = []; 
let wrongAnswers = []; 
let currentSubject = "";

// 학습 상태 저장소
let quizStates = {}; 

let isReviewMode = false;
let currentList = []; 
let currentIndex = 0;
let isAnswered = false; 
let userSelections = []; 

// 앱 시작 시 버전 체크 및 불러오기
loadProgress();

// 문제 데이터 불러오기
fetch('./questions.json')
    .then(res => res.json())
    .then(data => {
        allQuestions = data;
        console.log("데이터 로드 완료:", allQuestions.length);
    })
    .catch(err => {
        console.error(err);
        alert("데이터 로딩 실패. Live Server를 사용 중인지 확인하세요.");
    });


/* ==============================================
   2. 세이브/로드 기능 (버전 체크 포함)
   ============================================== */

function saveProgress() {
    const saveData = {
        version: APP_VERSION, // 저장할 때 버전도 같이 저장
        wrongAnswers: wrongAnswers,
        quizStates: quizStates
    };
    localStorage.setItem('medQuizSave', JSON.stringify(saveData));
}

function loadProgress() {
    const savedString = localStorage.getItem('medQuizSave');
    
    if (savedString) {
        const savedData = JSON.parse(savedString);
        
        // ★ [핵심] 저장된 버전과 현재 코드가 다르면? -> 초기화!
        if (savedData.version !== APP_VERSION) {
            alert("🚨 새로운 업데이트가 있습니다!\n문제가 갱신되어 진행 상황이 초기화됩니다.");
            localStorage.removeItem('medQuizSave'); // 구형 데이터 삭제
            return; // 불러오지 않고 종료 (새로 시작)
        }

        // 버전이 같으면 정상적으로 불러오기
        wrongAnswers = savedData.wrongAnswers || [];
        quizStates = savedData.quizStates || {};
    }
}


/* ==============================================
   3. 핵심 기능 함수들
   ============================================== */

// [유틸] 배열 섞기
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 1. 과목 선택
function startSubject(subjectName) {
    currentSubject = subjectName;

    if (quizStates[subjectName]) {
        currentList = quizStates[subjectName].list;
        currentIndex = quizStates[subjectName].index;
        isReviewMode = false; 
    } else {
        const filtered = allQuestions.filter(q => q.subject === subjectName);
        if (filtered.length === 0) {
            alert("이 과목은 문제가 없습니다.");
            return;
        }
        const shuffled = shuffleArray([...filtered]);
        quizStates[subjectName] = {
            list: shuffled,
            index: 0
        };
        currentList = shuffled;
        currentIndex = 0;
        
        saveProgress();
    }

    document.getElementById("subject-screen").style.display = "none";
    document.getElementById("quiz-screen").style.display = "block";

    renderQuestion();
}

// 2. 새로고침
function resetStudy() {
    if (!confirm("현재 과목의 진행 상황을 초기화하고 문제를 다시 섞을까요?")) return;
    
    delete quizStates[currentSubject];
    saveProgress();

    startSubject(currentSubject);
    alert("초기화 완료! 문제가 다시 섞였습니다.");
}

// 3. 문제 화면 그리기 (이미지 처리 강화판)
function renderQuestion() {
    const q = currentList[currentIndex];

    // (1) 상태 초기화
    isAnswered = false;
    userSelections = []; 
    
    document.getElementById("submit-btn").style.display = "block";
    document.getElementById("next-btn").style.display = "none";
    document.getElementById("prev-btn").style.display = (currentIndex === 0) ? "none" : "block";

    // 저장 (일반 모드만)
    if (!isReviewMode && quizStates[currentSubject]) {
        quizStates[currentSubject].index = currentIndex;
        saveProgress();
    }
    
    // 진행률
    const percent = (currentIndex / currentList.length) * 100;
    document.getElementById("progress-bar").style.width = `${percent}%`;

    // 제목
    document.getElementById("subject-display").innerText = 
        `${q.subject} ${isReviewMode ? "(오답)" : ""} (${currentIndex + 1}/${currentList.length})`;

    // 기출 태그
    const testBadge = document.getElementById("test-badge");
    if (q.test) {
        testBadge.innerText = q.test;       
        testBadge.style.display = "block";  // (참고: 아까 div로 감싸서 block으로 해도 됨)
    } else {
        testBadge.style.display = "none";   
    }

    // ★ [수정됨] 문제 텍스트 처리 (함수 사용)
    document.getElementById("question-text").innerHTML = `Q. ${processText(q.question)}`;

    // 보기 초기화
    document.getElementById("desc-area").style.display = "none";
    document.getElementById("result-msg").innerText = "";
    const optionsDiv = document.getElementById("options-container");
    optionsDiv.innerHTML = "";
    
    const opts = q.options.split("\n");
    opts.forEach((opt, idx) => {
        const btn = document.createElement("button");
        
        // ★ [중요 수정] 보기에도 이미지가 나오려면 innerHTML을 써야 함!
        btn.innerHTML = processText(opt); 
        
        btn.id = `option-btn-${idx + 1}`; 
        btn.className = "option-btn"; 
        btn.style.padding = "12px";
        btn.style.textAlign = "left";
        btn.style.border = "1px solid #ddd";
        btn.style.borderRadius = "8px";
        btn.style.backgroundColor = "white"; 
        btn.style.cursor = "pointer";
        
        btn.onclick = () => toggleOption(idx + 1, btn);
        optionsDiv.appendChild(btn);
    });

    updateButtons();
}

// 4-1. 보기 선택 토글
function toggleOption(num, btn) {
    if (isAnswered) return; 

    const index = userSelections.indexOf(num);
    
    if (index === -1) {
        userSelections.push(num);
        btn.style.backgroundColor = "#E3F2FD"; 
        btn.style.border = "2px solid #2196F3";
    } else {
        userSelections.splice(index, 1);
        btn.style.backgroundColor = "white"; 
        btn.style.border = "1px solid #ddd";
    }
}

// 4-2. 정답 제출
function submitAnswer() {
    if (userSelections.length === 0) {
        alert("답을 하나 이상 선택해주세요.");
        return;
    }

    const q = currentList[currentIndex];
    
    const correctAnswers = String(q.answer).match(/\d+/g).map(Number);
    userSelections.sort((a, b) => a - b);
    correctAnswers.sort((a, b) => a - b);

    const isCorrect = JSON.stringify(userSelections) === JSON.stringify(correctAnswers);

    const resultMsg = document.getElementById("result-msg");
    const descArea = document.getElementById("desc-area");

    if (isCorrect) {
        resultMsg.innerText = "✅ 정답입니다!";
        resultMsg.style.color = "green";
        userSelections.forEach(num => {
            const btn = document.getElementById(`option-btn-${num}`);
            if(btn) btn.style.backgroundColor = "#d1fae5";
        });
    } else {
        resultMsg.innerText = `❌ 오답입니다. (정답: ${q.answer})`;
        resultMsg.style.color = "red";
        userSelections.forEach(num => {
            const btn = document.getElementById(`option-btn-${num}`);
            if(btn) btn.style.backgroundColor = "#fee2e2";
        });
    }

    // ★ [수정됨] 해설에도 이미지 처리 적용
    descArea.innerHTML = `<strong>[해설]</strong><br>${processText(q.desc)}`;
    descArea.style.display = "block";

    isAnswered = true;
    
    document.getElementById("submit-btn").style.display = "none";
    document.getElementById("next-btn").style.display = "block";
}


// 5. 오답 노트
function handleWrongAnswerAction() {
    const currentQ = currentList[currentIndex];
    
    if (isReviewMode) {
        wrongAnswers = wrongAnswers.filter(q => q.id !== currentQ.id);
        currentList = currentList.filter(q => q.id !== currentQ.id);
        alert("오답노트에서 삭제했습니다!");
        
        saveProgress();

        if (currentList.length === 0) {
            toggleReviewMode(); 
        } else {
            if (currentIndex >= currentList.length) {
                currentIndex = Math.max(0, currentList.length - 1);
            }
            renderQuestion();
        }
    } else {
        if (!wrongAnswers.some(q => q.id === currentQ.id)) {
            wrongAnswers.push(currentQ);
            alert("오답노트에 추가됨");
            saveProgress();
        } else {
            alert("이미 존재함");
        }
    }
}

// 6. 모드 전환
function toggleReviewMode() {
    if (isReviewMode) {
        isReviewMode = false;
        if (quizStates[currentSubject]) {
            currentList = quizStates[currentSubject].list;
            currentIndex = quizStates[currentSubject].index; 
        } else {
            startSubject(currentSubject);
            return;
        }
        alert("전체 문제로 돌아갑니다.");
    } else {
        const myWrongs = wrongAnswers.filter(q => q.subject === currentSubject);
        if (myWrongs.length === 0) {
            alert("이 과목 오답이 없습니다.");
            return;
        }
        isReviewMode = true;
        currentList = [...myWrongs]; 
        currentIndex = 0; 
        alert("오답 복습 모드 (총 " + myWrongs.length + "문제)");
    }
    renderQuestion();
}

// 7. 다음/이전 문제
function nextQuestion() {
    if (currentIndex < currentList.length - 1) {
        currentIndex++;
        renderQuestion();
    } else {
        alert("마지막 문제입니다.");
    }
}

function prevQuestion() {
    if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
    }
}

// 8. 기타 함수
function goHome() {
    document.getElementById("quiz-screen").style.display = "none";
    document.getElementById("subject-screen").style.display = "block";
}

function updateButtons() {
    const modeBtn = document.getElementById("mode-btn");
    const actionBtn = document.getElementById("action-btn");
    if (isReviewMode) {
        modeBtn.innerText = "🔄 문제로 복귀";
        modeBtn.style.backgroundColor = "#FFEDD5";
        actionBtn.innerText = "🗑️ 삭제 (완료)";
        actionBtn.style.backgroundColor = "#ffcccc";
    } else {
        modeBtn.innerText = "⚡ 오답만 보기";
        modeBtn.style.backgroundColor = "#f0f0f0";
        actionBtn.innerText = "⭐ 오답 추가";
        actionBtn.style.backgroundColor = "#cce5ff";
    }
}

// HTML 연결
window.startSubject = startSubject;
window.resetStudy = resetStudy;
window.goHome = goHome;
window.toggleReviewMode = toggleReviewMode;
window.handleWrongAnswerAction = handleWrongAnswerAction;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.submitAnswer = submitAnswer;
window.toggleOption = toggleOption;

// [유틸] 텍스트 처리 함수 (줄바꿈 & 이미지 태그 변환)
function processText(text) {
    if (!text) return "";
    
    // 1. 이미지 태그 변환 {{filename.png}} -> <img ...>
    let processed = text.replace(
        /\{\{\s*(.*?)\s*\}\}/g, 
        '<img src="$1" style="max-width:100%; display:block; margin: 10px auto; border-radius: 5px;">'
    );
    
    // 2. 줄바꿈 변환 (\n -> <br>)
    processed = processed.replace(/\n/g, '<br>');
    
    return processed;
}