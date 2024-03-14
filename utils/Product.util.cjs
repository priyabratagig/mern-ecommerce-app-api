const Product = require("../models/Product.model.cjs")
const LogicError = require("./LogicError.cjs")

class ProductUtils {

    static async product_variant_exists({ params }) {
        const { productid, productname } = params
        if (!productid || !productname) throw new LogicError(404, "Prodcut not found")

        const products = await Product.findOne({ _id: productid })

        const variants = products.variants.map(variant => {
            return variant.name === productname ? variant : { color: variant.color }
        })

        const { __v, ...productsInfo } = products._doc

        return { ...productsInfo, variants }
    }

    static async products_exists({ params }) {
        const { productid } = params
        if (!productid) throw new LogicError(404, "productid is required")

        const products = await Product.findOne({ _id: productid })

        const { __v, ...productsInfo } = products._doc

        return productsInfo
    }

    static all_product_attritibutes_provided({ title, description, category, variants }) {
        if (!title) throw new LogicError({ status: 400, message: "Missing or invalid title" })
        if (!description) throw new LogicError({ status: 400, message: "Missing or invalid description" })
        if (!category || !category.length) throw new LogicError({ status: 400, message: "Missing or invalid category" })
        if (!variants || !variants.length) throw new LogicError({ status: 400, message: "Missing or invalid variants" })
        variants.forEach(variant => {
            if (!variant.name) throw new LogicError({ status: 400, message: "Missing or invalid variant name" })
            if (!variant.img || Buffer.isBuffer(variant.img)) throw new LogicError({ status: 400, message: "Missing or invalid variant image" })
            if (!variant.color) throw new LogicError({ status: 400, message: "Missing or invalid variant color" })
            if (!variant.size) throw new LogicError({ status: 400, message: "Missing or invalid variant size" })
            if (!variant.available) throw new LogicError({ status: 400, message: "Missing or invalid variant availability" })
            if (!variant.price) throw new LogicError({ status: 400, message: "Missing or invalid variant price" })
        })
    }

    static build_products_attrs({ title, description, category, variants }) {
        const variantsAttrs = variants.map(variant => {
            return {
                name: variant.name,
                img: variant.img,
                color: variant.color,
                size: variant.size,
                available: variant.available,
                price: variant.price
            }
        })

        return { title, description, category, variants: variantsAttrs }
    }
}

module.exports = ProductUtils