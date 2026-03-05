import React from "react";

export default function ProductItem({ product, onEdit, onDelete }) {
    return (
        <div className="productRow">
            <div className="productMain">
                <div className="productId">#{product.id}</div>
                <div className="productName">{product.name}</div>
                <div className="productCategory">{product.category}</div>
                <div className="productPrice">{product.price} ₽</div>
                <div className="productQuantity">На складе: {product.quantity}</div>
                {product.rating && (
                    <div className="productRating">⭐ {product.rating}</div>
                )}
            </div>

            <div className="productActions">
                <button className="btn" onClick={() => onEdit(product)}>
                    Редактировать
                </button>
                <button className="btn btn--danger" onClick={() => onDelete(product.id)}>
                    Удалить
                </button>
            </div>
        </div>
    );
}