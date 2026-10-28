// 참여자 응답을 구글 시트에 쌓는 웹앱. 설정 방법은 apps-script/README.md 참고.
const HEADERS = ['시각', '캐릭터', '들은 질문', '선택 답', '정답 여부', '새롭게 알게 된 점', '다음에 만나면'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('응답')
    || SpreadsheetApp.getActiveSpreadsheet().insertSheet('응답');
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  sheet.appendRow([
    new Date(), d.character, d.visited, d.pick, d.correct ? 'O' : 'X',
    String(d.learned || '').slice(0, 300), d.next
  ]);
  return ContentService.createTextOutput('ok');
}
