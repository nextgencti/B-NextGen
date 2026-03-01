const PDFDocument = require("pdfkit");
const fs = require("fs");

function generateCertificate(name, course) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(`certificate-${name}.pdf`));

  doc.fontSize(25).text("NextGen Computer Training Institute", {
    align: "center",
  });

  doc.moveDown();
  doc.fontSize(18).text(`This certifies that ${name}`, { align: "center" });
  doc.text(`has successfully completed ${course}`, { align: "center" });

  doc.end();
}

module.exports = generateCertificate;