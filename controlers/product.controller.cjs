const router = require("express").Router()
const Product = require("../models/Product.model.cjs")
const { LogicError, ProductUtils, HTTPUtils } = require("../utils")

//ADD
router.post("/add", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        ProductUtils.all_product_attritibutes_provided(req.body)

        const products = ProductUtils.build_products_attrs(req.body)
        const newProduct = new Product(products)
        const { __v, ...savedProductsInfo } = await newProduct.save()

        return httpUtils.send_json(200, savedProductsInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//UPDATE
router.patch("/update", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        ProductUtils.all_product_attritibutes_provided(req.body)
        const product = req.body.product

        const updatedProducts = await Product.updateProduct(product, req.body)
        const { __v, ...updatedProductsInfo } = updatedProducts._doc

        return httpUtils.send_json(200, updatedProductsInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET
router.get("/GET/:productid/:productname", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const product = req.params.product
        const { __v, ...productInfo } = product

        return httpUtils.send_json(200, productInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET ALL
router.get("/get-all/:productid", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const products = req.params.products
        const { __v, ...productsInfo } = products

        return httpUtils.send_json(200, productsInfo)
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

        return httpUtils.send_json(200, "Products deleted successfully")
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

module.exports = router