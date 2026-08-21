import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/lib/models";

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

export async function POST(request: Request) {
    try {
        await connectDB();

        const formData = await request.formData();

        const name = String(formData.get("name") ?? "").trim();
        const thresholdValue = String(
            formData.get("lowStockThreshold") ?? "",
        );

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

        let image: string | null = null;

        if (isUploadFile(imageFile)) {
            image = await uploadProductImage(imageFile);
        }

        const product = await Product.create({
            name,
            lowStockThreshold,
            image,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Product created successfully.",
                productId: product._id.toString(),
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("[api/products] POST failed:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Unable to create product. Please try again.",
            },
            { status: 500 },
        );
    }
}