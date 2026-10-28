import { useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Image, X, Loader2 } from 'lucide-react';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { Image as UIImage } from '@client/src/components/ui/image';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 5;
const MAX_COUNT = 9;

interface PendingImage {
  url: string;
  uploading: boolean;
  file: File;
}

interface PostImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
}

const PostImageUploader = ({ images, onChange, disabled }: PostImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendings, setPendings] = useState<PendingImage[]>([]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return '不支持的图片格式，仅支持 jpg/png/gif/webp';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `图片过大，单张不能超过 ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const totalCount = images.length + pendings.length;
    if (totalCount >= MAX_COUNT) {
      toast.error(`最多上传 ${MAX_COUNT} 张图片`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const remaining = MAX_COUNT - totalCount;
    const fileList = Array.from(files).slice(0, remaining);

    const invalids: string[] = [];
    const valids: File[] = [];
    for (const file of fileList) {
      const err = validateFile(file);
      if (err) {
        invalids.push(`${file.name}: ${err}`);
      } else {
        valids.push(file);
      }
    }

    if (invalids.length > 0) {
      toast.error(invalids.join('\n'));
    }

    if (valids.length === 0) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const previewPendings: PendingImage[] = valids.map((file) => ({
      url: URL.createObjectURL(file),
      uploading: true,
      file,
    }));
    setPendings((prev) => [...prev, ...previewPendings]);
    if (inputRef.current) inputRef.current.value = '';

    valids.forEach(async (file, idx) => {
      const previewUrl = previewPendings[idx].url;
      try {
        const dataloom = await getDataloom();
        const { data, error } = await dataloom
          .storage
          .from(getDefaultBucketId())
          .uploadFile(file);
        if (error || !data?.download_url) {
          const errMsg = (error as { message?: string; error_msg?: string })?.message
            || (error as { message?: string; error_msg?: string })?.error_msg
            || '上传失败';
          throw new Error(errMsg);
        }
        const downloadUrl = data.download_url;
        onChange([...images, downloadUrl]);
        setPendings((prev) => prev.filter((p) => p.url !== previewUrl));
        URL.revokeObjectURL(previewUrl);
        toast.success('图片上传成功');
      } catch (err: unknown) {
        logger.error('Image upload failed', err);
        setPendings((prev) => prev.filter((p) => p.url !== previewUrl));
        URL.revokeObjectURL(previewUrl);
        const msg = (err as Error)?.message || '图片上传失败，请稍后重试';
        toast.error(msg);
      }
    });
  };

  const handleRemove = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
  };

  const canAddMore = images.length + pendings.length < MAX_COUNT && !disabled;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((url, idx) => (
          <div
            key={url + idx}
            className="relative size-20 rounded-md overflow-hidden border border-slate-200 bg-slate-50"
          >
            <UIImage
              src={url}
              alt={`图片${idx + 1}`}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1 right-1 size-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                aria-label="删除图片"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}
        {pendings.map((p) => (
          <div
            key={p.url}
            className="relative size-20 rounded-md overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center"
          >
            <UIImage
              src={p.url}
              alt="上传中"
              className="w-full h-full object-cover opacity-60"
            />
            <Loader2 className="absolute size-5 text-white animate-spin drop-shadow" />
          </div>
        ))}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="size-20 rounded-md border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-400 hover:text-indigo-500 transition-colors flex flex-col items-center justify-center gap-1"
          >
            <Image className="size-5" />
            <span className="text-xs">添加图片</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={handlePick}
        className="hidden"
        disabled={disabled}
      />
      <p className="text-xs text-slate-400">
        支持 jpg/png/gif/webp，单张不超过 {MAX_SIZE_MB}MB，最多 {MAX_COUNT} 张
      </p>
    </div>
  );
};

export default PostImageUploader;
