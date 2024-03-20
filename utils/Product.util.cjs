const Product = require("../models/Product.model.cjs")
const LogicError = require("./LogicError.cjs")

class ProductUtils {

    static async product_variant_exists({ params: { productid, productname } }) {
        if (!productid || !productname) throw new LogicError({ status: 404, message: "Producutid and productname is required" })

        const products = await Product.findOne({ _id: productid }).then(products => products?.toObject())
        if (!products) throw new LogicError({ status: 404, message: "Product not found" })

        const variant = products.variants.find(variant => variant.name === productname)
        if (!variant) throw new LogicError({ status: 404, message: "Product not found" })

        const variants = products.variants.map(variant => {
            return variant.name === productname ? variant : { color: variant.color, name: variant.name }
        })
        const { _id, __v, ...productsInfo } = products
        productsInfo._id = String(_id)

        return { ...productsInfo, variants }
    }

    static async products_exists({ productid }) {
        if (!productid) throw new LogicError({ status: 404, message: "productid is required" })

        const products = await Product.findOne({ _id: productid }).then(products => products?.toObject())
        if (!products) throw new LogicError({ status: 404, message: "Product not found" })

        const { _id, __v, ...productsInfo } = products
        productsInfo._id = String(_id)

        return productsInfo
    }

    static all_product_attritibutes_provided({ title, desc, categories, variants }) {
        if (!title) throw new LogicError({ status: 400, message: "Missing or invalid title" })
        if (!desc) throw new LogicError({ status: 400, message: "Missing or invalid desc" })
        if (!categories) throw new LogicError({ status: 400, message: "Missing categories" })
        if (!categories.length) throw new LogicError({ status: 400, message: "At least one category is required" })
        if (!variants) throw new LogicError({ status: 400, message: "Missing variants" })
        if (!variants.length) throw new LogicError({ status: 400, message: "At least one variant is required" })
        variants.forEach(variant => {
            if (!variant.name) throw new LogicError({ status: 400, message: "Missing or invalid variant name" })
            // if (!variant.img || Buffer.isBuffer(variant.img)) throw new LogicError({ status: 400, message: "Missing or invalid variant img" })
            if (!variant.color) throw new LogicError({ status: 400, message: "Missing or invalid variant color" })
            if (!variant.stocks) throw new LogicError({ status: 400, message: "Missing stocks" })
            if (!variant.stocks.length) throw new LogicError({ status: 400, message: "At least one size is required" })
            if (!variant.price) throw new LogicError({ status: 400, message: "Missing or invalid variant price" })

            variant.stocks.forEach(size => {
                if (!size.size) throw new LogicError({ status: 400, message: "Missing or invalid size" })
                if (!size.hasOwnProperty('available')) throw new LogicError({ status: 400, message: "Missing or invalid available" })
            })
        })
    }

    static build_products_attrs({ title, desc, categories, variants }) {
        ProductUtils.all_product_attritibutes_provided({ title, desc, categories, variants })

        const variantsAttrs = variants.map(variant => {
            return {
                name: variant.name,
                img: variant.img,
                color: variant.color,
                stocks: variant.stocks,
                price: variant.price
            }
        })

        return { title, desc, categories, variants: variantsAttrs }
    }
}

module.exports = ProductUtils