import * as multer from 'multer';
import * as fs from 'fs';

// multer.distkStorage 是磁盘存储
const storage = multer.diskStorage({
  // 指定保存的目录
  destination: function (req, file, cb) {
    try {
      fs.mkdirSync('uploads');
    } catch (e) {}

    cb(null, 'uploads');
  },
  // 指定保存文件名
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9) +
      '-' +
      file.originalname;
    cb(null, uniqueSuffix);
  },
});

export { storage };
