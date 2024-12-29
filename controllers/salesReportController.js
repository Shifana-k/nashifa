const moment = require('moment');
const Order=require('../models/orderModel')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');

const renderSalesReport = async(req,res)=>{
    try {
        res.render('salesReport',{ moment })
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
}


const getQueryByDateRange = (dateRange, startDate, endDate) => {
    let query = {};
    const now = moment();
  
    if (dateRange === "custom" && startDate && endDate) {
      query = {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      };
    } else if (dateRange === "daily") {
      query = {
        createdAt: {
          $gte: now.startOf("day").toDate(),
          $lte: now.endOf("day").toDate(),
        },
      };
    } else if (dateRange === "weekly") {
      query = {
        createdAt: {
          $gte: now.startOf("week").toDate(),
          $lte: now.endOf("week").toDate(),
        },
      };
    } else if (dateRange === "yearly") {
      query = {
        createdAt: {
          $gte: now.startOf("year").toDate(),
          $lte: now.endOf("year").toDate(),
        },
      };
    }
  
  
    return query;
  };


  const getOrderedItems = (orders) => {
    return orders.flatMap((order) =>
      order.orderedItem.map((item) => ({
        saleId: order._id,
        customerName: order.userId?.name || "Unknown",
        productName: item.productId?.name || "No Product Name",
        productImage: item.productId?.mainImage || "",
        quantity: item.quantity,
        totalPrice: item.totalProductAmount,
        discount: order.discount || 0, // Add discount
        finalPrice: item.totalProductAmount - (order.discount || 0), // Add final price after discount
        saleDate: order.createdAt,
        itemStatus: item.status || "Pending",
        deliveryAddress: order.deliveryAddress?.address || "Unknown",
      }))
    );
  };


const sortReport = async(req,res)=>{
    try {
        const { dateRange, startDate, endDate, page } = req.body;
  
  
        const query = getQueryByDateRange(dateRange, startDate, endDate);
    
    
        const orders = await Order.find(query)
          .populate({
            path: 'orderedItem.productId',
            select: 'name mainImage price status',
          })
          .populate('userId')
          .populate('deliveryAddress');
    
    
    
        const orderedItems = getOrderedItems(orders);
    
    
    
        const pageNum = parseInt(page) || 1;
        const limit = 4;
        const skip = (pageNum - 1) * limit;
        const paginatedItems = orderedItems.slice(skip, skip + limit);
    
        const totalPages = Math.ceil(orderedItems.length / limit);
    
    
    
        res.json({
          salesData: paginatedItems,
          totalPages: totalPages,
          currentPage: pageNum
        });
      } catch (error) {
       
        res.status(500).json({ message: "Internal Server Error" });
      }
}


const downloadSalesReport = async(req,res)=>{
    try {
        const orders = await Order.find().populate('orderedItem.productId').populate('userId');
  
      const salesData = orders.flatMap(order =>
        order.orderedItem.map(item => ({
          saleId: order._id,
          customerName: order.userId?.name || 'Unknown',
          productName: item.productId?.name || 'No Product Name',
          quantity: item.quantity,
          price: item.productId?.price || 0,
          totalAmount: (item.quantity * (item.productId?.price || 0)),
          discount: order.discount || 0,
          finalAmount: (item.quantity * (item.productId?.price || 0)) - (order.discount || 0),
          saleDate: order.createdAt
        }))
      );
  
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const reportsDir = path.join(__dirname, '../public/reports');
  
      await fsPromises.mkdir(reportsDir, { recursive: true });
  
      const filePath = path.join(reportsDir, `salesReport_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);
  
     
      const generateHr = (y) => {
        doc.strokeColor("#aaaaaa")
           .lineWidth(1)
           .moveTo(50, y)
           .lineTo(550, y)
           .stroke();
      }
  
      const formatCurrency = (amount) => {
        if (typeof amount !== 'number' || isNaN(amount)) {
          return 'Rs. 0.00'; 
        }
        return "Rs. " + amount.toFixed(2);
      }
  
      const formatDate = (date) => {
        return moment(date).format('DD/MM/YYYY');
      }
  
  
      let pageNumber = 1;
      doc.on('pageAdded', () => {
        pageNumber++;
        doc.text(`Page ${pageNumber}`, 50, 750, { align: 'center' });
      });
  
  
      doc.fillColor("#444444")
         .fontSize(28)
         .text("Nashifa", 50, 50, { align: 'center' })
         .fontSize(20)
         .text("Sales Report", 50, 80, { align: 'center' })
         .fontSize(10)
         .text(`Generated on: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, 50, 100, { align: 'center' });
  
      generateHr(120);
  
   
      const reportDetailsTop = 140;
      const startDate = formatDate(salesData[0]?.saleDate);
      const endDate = formatDate(salesData[salesData.length - 1]?.saleDate);
      doc.fontSize(10)
         .text("Report Period:", 50, reportDetailsTop)
         .text(`From: ${startDate}`, 150, reportDetailsTop)
         .text(`To: ${endDate}`, 300, reportDetailsTop)
         .text("Total Orders:", 50, reportDetailsTop + 20)
         .text(orders.length.toString(), 150, reportDetailsTop + 20)
         .text("Total Products Sold:", 50, reportDetailsTop + 40)
         .text(salesData.reduce((sum, sale) => sum + sale.quantity, 0).toString(), 150, reportDetailsTop + 40);
  
      generateHr(reportDetailsTop + 60);
  
    
      const tableTop = 240;
      let y = tableTop;
  
      const generateTableRow = (y, saleId, customer, product, qty, price, total, discount, final, date) => {
        doc.fontSize(9)
           .text(saleId, 50, y, { width: 70 })
           .text(customer, 120, y, { width: 100 })
           .text(product, 200, y, { width: 100 })
           .text(qty.toString(), 240, y, { width: 50, align: 'right' })
           .text(price, 290, y, { width: 60, align: 'right' })
           .text(total, 350, y, { width: 60, align: 'right' })
           .text(discount, 400, y, { width: 60, align: 'right' })
           .text(final, 450, y, { width: 60, align: 'right' })
           .text(date, 520, y, { width: 60 });
      };
  
      
      doc.font('Helvetica-Bold');
      generateTableRow(y, 'Sale ID', 'Customer', 'Product', 'Qty', 'Price', 'Total', 'Discount',
      'Final', 'Date');
      generateHr(y + 20);
      y += 30;
  
      doc.font('Helvetica');
      let totalSales = 0;
      let totalDiscounts = 0;
      salesData.forEach((sale) => {
        generateTableRow(
          y,
          sale.saleId.toString().slice(-6),
          sale.customerName.slice(0, 15),
          sale.productName.slice(0, 15),
          sale.quantity,
          formatCurrency(sale.price),
          formatCurrency(sale.totalAmount),
          formatCurrency(sale.discount),
          formatCurrency(sale.finalAmount),
          formatDate(sale.saleDate)
        );
        totalSales += sale.totalAmount;
        totalDiscounts += sale.discount;
        y += 20;
        generateHr(y);
        y += 10;
  
        if (y > 700) {
          doc.addPage();
          y = 50;
          generateHr(y - 10);
        }
      });
  
  
      y += 10;
      doc.font('Helvetica-Bold');
      doc.text(`Total Sales: ${formatCurrency(totalSales)}`, 390, y);
      doc.text(`Total Discounts: ${formatCurrency(totalDiscounts)}`, 390, y + 20);
      
  
      doc.fontSize(10)
         .text(
          "© 2024 Nashifa. All rights reserved.",
          50,
          730,
          { align: "center", width: 500 }
        );
  
      doc.end();
  
      writeStream.on('finish', () => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${path.basename(filePath)}`);
        res.sendFile(filePath, (err) => {
          if (err) {
            console.error("Error sending file:", err);
            res.status(500).send("Error downloading PDF");
          }
         
          fs.unlinkSync(filePath);
        });
      });
  
      writeStream.on('error', (err) => {
        console.error("Error writing PDF:", err);
        res.status(500).send("Error generating PDF");
      });
  
    } catch (error) {
      console.error("Error in downloadSalesReport:", error);
      res.status(500).send("Internal Server Error");
    }
}


const downloadSalesExcel = async(req,res)=>{
  try {
    const orders = await Order.find()
            .populate('orderedItem.productId')
            .populate('userId');

        const salesData = orders.flatMap(order =>
            order.orderedItem.map(item => ({
                'Sale ID': order._id.toString(),
                'Customer Name': order.userId?.name || 'Unknown',
                'Product Name': item.productId?.name || 'No Product Name',
                'Quantity': item.quantity,
                'Unit Price': item.productId?.price || 0,
                'Total Amount': (item.quantity * (item.productId?.price || 0)),
                'Discount': order.discount || 0,
                'Final Amount': (item.quantity * (item.productId?.price || 0)) - (order.discount || 0),
                'Sale Date': moment(order.createdAt).format('DD/MM/YYYY')
            }))
        );

        // Create a new workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(salesData);

        // Add column widths
        const colWidths = [
            { wch: 24 }, // Sale ID
            { wch: 20 }, // Customer Name
            { wch: 30 }, // Product Name
            { wch: 10 }, // Quantity
            { wch: 12 }, // Unit Price
            { wch: 12 }, // Total Amount
            { wch: 12 }, // Discount
            { wch: 12 }, // Final Amount
            { wch: 12 }  // Sale Date
        ];
        worksheet['!cols'] = colWidths;

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

        // Generate Excel file
        const excelFileName = `salesReport_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${excelFileName}`);
        
        // Send the file
        res.send(excelBuffer);

  } catch (error) {
    console.log("Error in downloadSalesExcel");
    
    console.log(error.message);
  }
}
module.exports={
    renderSalesReport,
    sortReport,
    downloadSalesReport,
    downloadSalesExcel,
}