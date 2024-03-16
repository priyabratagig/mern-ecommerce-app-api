const router = require("express").Router()
const Product = require("../models/Product.model.cjs")
const { ProductUtils, HTTPUtils } = require("../utils")

//ADD
router.post("/add", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        ProductUtils.all_product_attritibutes_provided(req.body)

        const products = ProductUtils.build_products_attrs(req.body)
        const newProduct = new Product(products)
        const savedProducts = await newProduct.save()
        const { _id, __v, ...savedProductsInfo } = savedProducts._doc
        savedProducts.productid = String(_id)

        return httpUtils.send_json(200, savedProductsInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//UPDATE
router.post("/update", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        ProductUtils.all_product_attritibutes_provided(req.body)
        const products = req.body.products
        const newProducts = ProductUtils.build_products_attrs(req.body)

        const updatedProducts = await Product.updateProducts(products, newProducts)
        const { __v, ...updatedProductsInfo } = updatedProducts._doc

        return httpUtils.send_json(200, updatedProductsInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET PRODUCT
router.get("/get/:productid/:productname", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const product = req.product
        const { _id, __v, ...productInfo } = product
        productInfo.productid = String(_id)

        return httpUtils.send_json(200, productInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET PRODUCT GROUP
router.get("/get-group/:productid", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const products_group = req.products_group
        const { _id, __v, ...productsInfo } = products_group
        productsInfo.productid = String(_id)

        return httpUtils.send_json(200, productsInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET ALL CATEGORIES
router.get("/get-by-categories/:categories", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const categories = String(req.params.categories).split('+')
        const pageno = req.body?.pageno || 1
        const pagesize = req.body?.pagesize || 10
        const skip = pagesize * (pageno - 1)
        const limit = pagesize

        const productsData = await Product.findByCategoryNames(categories, skip, limit)

        if (!productsData) return httpUtils.send_message(400, "No products found")

        productsData.products.forEach(product => {
            const id = String(product._id)
            delete product._id
            product.productid = id
        })

        return httpUtils.send_json(200, productsData)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET ALL
router.get("/get-all", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const pageno = req.body?.pageno || 1
        const pagesize = req.body?.pagesize || 10
        const skip = pagesize * (pageno - 1)
        const limit = pagesize

        const productsData = await Product.findAllProducts(skip, limit)

        if (!productsData) return httpUtils.send_message(400, "No products found")

        productsData.products.forEach(product => {
            const id = String(product._id)
            delete product._id
            product.productid = id
        })

        return httpUtils.send_json(200, productsData)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//SEARCH
router.get("/search", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const pageno = req.body?.pageno || 1
        const pagesize = req.body?.pagesize || 10
        const skip = pagesize * (pageno - 1)
        const limit = pagesize
        const search = req.body?.search

        if (!search) return httpUtils.send_message(400, "search string not provided")

        const productsData = await Product.searchProducts(search, skip, limit)

        if (!productsData) return httpUtils.send_message(400, "No products found")

        productsData.products.forEach(product => {
            const id = String(product._id)
            delete product._id
            product.productid = id
        })

        return httpUtils.send_json(200, productsData)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//DELETE
router.delete("/delete", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const productid = req.body.productid
        await Product.deleteOne({ _id: productid })

        return httpUtils.send_message(200, "Products deleted successfully")
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

module.exports = router