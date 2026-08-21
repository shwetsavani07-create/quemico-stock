import { NextResponse } from "next/server";
import mongoose from "mongoose";
import cloudinary from "@/lib/cloudinary";
import { connectDB } from "@/lib/mongodb";
import {
    Product,
    StockBatch,
    StockMovement,
} from "@/lib/models";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/webp",
]);

function isUploadFile(value: FormDataEntryValue | null): value is File {
    return (
        value !== null &&
        typeof value === "object" &&
        "arrayBuffer" in value &&
        typeof (value as File).arrayBuffer === "function" &&
        (value as File).size > 0
    );
}

function getMimeType(file: File): string | null {
    const mime = file.type.trim().toLowerCase();

    if (mime && ALLOWED_IMAGE_TYPES.has(mime)) {
        return mime;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "jpg" || extension === "jpeg") {
        return "image/jpeg";
    }

    if (extension === "png") {
        return "image/png";
    }

    if (extension === "webp") {
        return "image/webp";
    }

    return null;
}

async function uploadProductImage(file: File): Promise<string> {
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error("Image must be 5 MB or smaller.");
    }

    const mimeType = getMimeType(file);

    if (!mimeType) {
        throw new Error("Please upload a JPG, PNG, or WEBP image.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    return new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "quemico-stock/products",
                resource_type: "image",
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (!result?.secure_url) {
                    reject(new Error("Cloudinary did not return an image URL."));
                    return;
                }

                resolve(result.secure_url);
            },
        );

        stream.end(buffer);
    });
}

function getCloudinaryPublicId(imageUrl: string | null | undefined) {
    if (!imageUrl) {
        return null;
    }

    try {
        const url = new URL(imageUrl);

        const marker = "/image/upload/";
        const index = url.pathname.indexOf(marker);

        if (index === -1) {
            return null;
        }

        let publicId = url.pathname.slice(
            index + marker.length,
        );

        // Remove Cloudinary transformations if present.
        const parts = publicId.split("/");

        const versionIndex = parts.findIndex((part) =>
            /^v\d+$/.test(part),
        );

        if (versionIndex !== -1) {
            publicId = parts.slice(versionIndex + 1).join("/");
        }

        // Remove file extension.
        publicId = publicId.replace(/\.[^/.]+$/, "");

        return publicId;
    } catch {
        return null;
    }
}

async function deleteCloudinaryImage(imageUrl: string | null) {
    const publicId = getCloudinaryPublicId(imageUrl);

    if (!publicId) {
        return;
    }

    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
        });
    } catch (error) {
        console.error(
            "[cloudinary] Failed to delete product image:",
            error,
        );
    }
}

export async function PUT(
    request: Request,
    context: {
        params: Promise<{ id: string }>;
    },
) {
    const { id } = await context.params;

    try {
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid product ID.",
                },
                { status: 400 },
            );
        }

        await connectDB();

        const existing = await Product.findById(id);

        if (!existing) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Product not found.",
                },
                { status: 404 },
            );
        }

        const formData = await request.formData();

        const name = String(formData.get("name") ?? "").trim();

        const thresholdValue = String(
            formData.get("lowStockThreshold") ?? "",
        );

        const removeImage =
            formData.get("removeImage") === "true";

        if (!name) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Name required.",
                },
                { status: 400 },
            );
        }

        const lowStockThreshold = Number(thresholdValue);

        if (
            !Number.isInteger(lowStockThreshold) ||
            lowStockThreshold < 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Low-stock threshold must be >= 0.",
                },
                { status: 400 },
            );
        }

        const imageFile = formData.get("image");

        let image = existing.image ?? null;

        if (removeImage) {
            await deleteCloudinaryImage(image);
            image = null;
        }

        if (isUploadFile(imageFile)) {
            const oldImage = image;

            image = await uploadProductImage(imageFile);

            if (oldImage) {
                await deleteCloudinaryImage(oldImage);
            }
        }

        await Product.findByIdAndUpdate(
            id,
            {
                name,
                lowStockThreshold,
                image,
            },
            {
                new: true,
            },
        );

        return NextResponse.json({
            success: true,
            message: "Product updated successfully.",
            productId: id,
        });
    } catch (error) {
        console.error("[api/products/:id] PUT failed:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Unable to update product. Please try again.",
            },
            { status: 500 },
        );
    }
}

export async function DELETE(
    _request: Request,
    context: {
        params: Promise<{ id: string }>;
    },
) {
    const { id } = await context.params;

    try {
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid product ID.",
                },
                { status: 400 },
            );
        }

        await connectDB();

        const product = await Product.findById(id);

        if (!product) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Product not found.",
                },
                { status: 404 },
            );
        }

        await Promise.all([
            StockMovement.deleteMany({ productId: id }),
            StockBatch.deleteMany({ productId: id }),
        ]);

        await Product.findByIdAndDelete(id);

        await deleteCloudinaryImage(product.image ?? null);

        return NextResponse.json({
            success: true,
            message: "Product deleted successfully.",
        });
    } catch (error) {
        console.error("[api/products/:id] DELETE failed:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to delete product. Please try again.",
            },
            { status: 500 },
        );
    }
}