export async function prepareAvatar(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("头像图片不能超过 8MB");
  }

  const image = await loadImage(file);
  const size = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - size) / 2;
  const sourceY = (image.naturalHeight - size) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法处理头像");
  context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 256, 256);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("头像处理失败"))),
      "image/webp",
      0.82,
    );
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取这张图片"));
    };
    image.src = url;
  });
}
