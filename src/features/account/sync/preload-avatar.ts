export function preloadAvatar(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      finish(new Error("头像加载超时"));
      image.src = "";
    }, 10_000);
    image.onload = () => finish();
    image.onerror = () => finish(new Error("头像图片加载失败"));
    image.src = url;
  });
}
