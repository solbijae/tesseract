const express = require('express');
const app = express();
const router = require('./Router');

// public 폴더를 정적 파일 경로로 설정
app.use(express.static('public'));
// 이미지 파일이 위치한 디렉토리를 정적 파일 경로로 설정
app.use(express.static('data/input'));

app.use('/', router);

app.listen(3000, () => {
  console.log('Server started on port 3000');
});