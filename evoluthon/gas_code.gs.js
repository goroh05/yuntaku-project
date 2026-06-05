// ★ここに比嘉さんのGemini APIキーを設定してあります。
const GEMINI_API_KEY = "AIzaSyC1_DqUNCeTXKMt2lJYco_M3_rWyFgApkU"; 

// 接続確認・HTML描画のためのdoGet（マイク対話ユニットの画面をGAS上で表示します）
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('音声入力・AI対話ユニット')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function processChat(text) {
  if (!text) return "何か話しかけてほしいさー！";
  try {
    return getGeminiResponse(text);
  } catch (e) {
    console.error(e);
    return "知恵熱が出ちゃったさー。設定をもう一度確認するね！";
  }
}

function getGeminiResponse(userMessage) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "ここにAPIキーを入れてください") {
    return "APIキーの設定がまだ反映されていないみたいさー！";
  }
  return callGeminiAPI(userMessage);
}

// 別プロジェクトのスマホ送信用doPost（Netlifyや外部連携用、スプレッドシートへの記録機能付き）
function doPost(e) {
  try {
    const p = e.parameter;
    const userText = p.text;
    
    // 1. スプレッドシートを取得（最もエラーが起きない確実な方法）
    let sheet;
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        sheet = ss.getSheets()[0];
      }
    } catch(err) {
      console.log("スプレッドシートが開けませんでした。");
    }
    
    if (!sheet) {
      // ログ出力用シートが取得できない場合は、スタンドアロンで動かします
    } else {
      // 日時と比嘉さんの発言をシートに記録
      const timestamp = new Date();
      sheet.appendRow([timestamp, "比嘉さん", userText]);
    }
    
    // 2. AI（Gemini）にお返事を聞く
    let aiResponse = "";
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "ここにAPIキーを入れてください") {
      aiResponse = "比嘉さん、繋がりました！マイクからGoogleへの送信はもう大成功です！あとはGoogle Apps Scriptに『APIキー』を入力すれば、私（ジェミー）が青色申告についていつでも詳しくお答えできるようになりますよ！";
    } else {
      aiResponse = callGeminiAPI(userText);
    }
    
    // AIの返答をシートに記録
    if (sheet) {
      sheet.appendRow([new Date(), "AIの回答", aiResponse]);
    }
    
    // 3. スマホ画面にAIのお返事を返す
    return ContentService.createTextOutput(aiResponse)
                         .setMimeType(ContentService.MimeType.TEXT);
                         
  } catch (err) {
    console.error("エラー発生: " + err.toString());
    return ContentService.createTextOutput("エラーが発生しました: " + err.toString())
                         .setMimeType(ContentService.MimeType.TEXT);
  }
}

// Gemini APIを呼び出す関数（比嘉様モデル：2.5-flashにアップデート済）
function callGeminiAPI(promptText) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;
  
  const systemPrompt = "あなたはRATIO（ラティオ）㈱の『RAシーサー』です。代表取締役は武田広明（たけだこうめい）です。比嘉様は本システムの開発パートナーです。回答は『はいさい！』で始め、3行以内で極めて簡潔に、温かい言葉遣いで答えてください。";

  const payload = {
    "contents": [{
      "parts": [{
        "text": systemPrompt + "\n\n質問: " + promptText
      }]
    }]
  };
  
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  
  if (json.candidates && json.candidates[0].content.parts[0].text) {
    return json.candidates[0].content.parts[0].text;
  } else {
    return "AIから有効な返答が得られませんでした。APIキーや設定を確認してください。";
  }
}