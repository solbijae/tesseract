const express = require('express');
const router = express.Router();
const path = require('path');
var fs = require('fs');
const multer = require('multer');
const { exec } = require("child_process");
const StringFormat = require('string-format');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/licensePlate.db');
var http = require('http');


var d = new Date();
let tmpdate = d.getTime() + parseInt(Math.random()*10000).toString();

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "data/input/");
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, path.basename(file.originalname+tmpdate, ext) + ext);
    },
});
  
var upload = multer({ storage: storage });

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './index.html'));
});

router.post('/upload', upload.single('file'), (req, res) => {
    // 업로드된 파일 정보는 req.file에서 접근할 수 있음
    const uploadedFile = req.file;
    // 업로드된 파일의 원래 이름은 uploadedFile.originalname로 접근할 수 있음
    const name = uploadedFile.filename;
    const path = uploadedFile.path;
  
    console.log(uploadedFile)
    // 업로드 완료 후 응답
    res.send({
        inputPath : path,
        fileName : name
    });
});

router.get('/ocr', (req, res) => {
    var inputPath = req.query.inputPath;
    var fileName = req.query.fileName;
    console.log(inputPath)
    console.log(fileName)

    var cmd = `tesseract "D:\\_workspace\\tesseract2\\data\\input\\${fileName}" "D:\\_workspace\\tesseract2\\data\\output\\${fileName}" --oem 3 --psm 1 -l kor+eng -c tessedit_create_txt=1`;

    var command = StringFormat(cmd);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`명령어 실행 중 오류 발생: ${error}`);
            return;
        }

        console.log('표준 출력:', stdout);
        console.error('표준 에러:', stderr);

        const output = fs.readFileSync(`D:\\_workspace\\tesseract2\\data\\output\\${fileName}.txt`, 'utf-8');
        console.log(output)
        const result = output.replace(/(\s*)/g, "");

        const pattern = /[0-9０-９]+|[ㄱ-ㅎ가-힣]+/g;
        const insertQuery = 'INSERT INTO license (carType, carPurpose, carNum, occupation) VALUES (?, ?, ?, ?)';

        const matches = result.match(pattern);
        if (matches && matches.length === 3) {
            const carType = matches[0].replace(/[^0-9０-９]/g, '').slice(0, 3);
            const carPurpose = matches[1];
            const carNum = parseInt(matches[2].replace(/[^0-9]/g, '').slice(-4));
        
            console.log('First Numbers:',  carType);
            console.log('Korean Character:', carPurpose);
            console.log('Last Numbers:', carNum);

            // // carType 분류
            // if (carType >= 100 && carType <= 699) {
            //     carTypeClassification = "승용차";
            // } else if (carType >= 700 && carType <= 799) {
            //     carTypeClassification = "승합차";
            // } else if (carType >= 800 && carType <= 979) {
            //     carTypeClassification = "화물차";
            // } else if (carType >= 980 && carType <= 997) {
            //     carTypeClassification = "특수차";
            // } else if (carType >= 998 && carType <= 999) {
            //     carTypeClassification = "긴급차";
            // } else{
            //     carTypeClassification = "unsure"
            // }
            
            // carPurpose 분류
            if (carPurpose === "아" || carPurpose === "바" || carPurpose === "사" || carPurpose === "자") {
                occupation = "운수사업용";
            } else if (carPurpose === "허" || carPurpose === "하" || carPurpose === "호") {
                occupation = "택배/렌터카";
            } else {
                occupation = "자가용";
            }
            
            // console.log("Car Type Classification:", carTypeClassification);
            console.log("Car Purpose Classification:", occupation);
            
            db.run(insertQuery, [carType, carPurpose, carNum, occupation], function(err) {
                if (err) {
                  console.error('Error inserting data:', err);
                } else {
                  console.log('Data inserted successfully.');
                }
              
                // 데이터베이스 연결 종료
                // db.close();
              });

        } else {
            console.log('No matches found.');
        }
        
        res.send({
            output : output,
            occupation : occupation
        });
    });

});

module.exports = router;