import cv2
import numpy as np
from pathlib import Path
from typing import Union, Tuple

def load_image(path: Union[str, Path]) -> np.ndarray:
    """
    Reads an image from a file path using OpenCV.
    Raises ValueError if image file cannot be loaded or is invalid.
    """
    path_str = str(path)
    if not Path(path_str).exists():
        raise ValueError(f"Image file does not exist at path: {path_str}")
    
    img = cv2.imread(path_str)
    if img is None:
        raise ValueError(f"Failed to decode image at path: {path_str}")
    return img

def save_image(image: np.ndarray, path: Union[str, Path]) -> bool:
    """
    Saves an OpenCV BGR image array to disk.
    Creates parent directories if necessary.
    """
    path_obj = Path(path)
    path_obj.parent.mkdir(parents=True, exist_ok=True)
    success = cv2.imwrite(str(path_obj), image)
    if not success:
        raise IOError(f"Failed to write image to disk at: {path_obj}")
    return True

def validate_image_bytes(data: bytes) -> np.ndarray:
    """
    Validates and decodes raw byte stream into an OpenCV BGR image array.
    Does not rely on filename extension.
    """
    if not data or len(data) == 0:
        raise ValueError("Image data stream is empty")
    
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None or img.size == 0:
        raise ValueError("Corrupted or unsupported image file format")
    return img

def resize_image(image: np.ndarray, max_width: int) -> np.ndarray:
    """
    Resizes image maintaining aspect ratio if width exceeds max_width.
    """
    height, width = image.shape[:2]
    if width <= max_width or max_width <= 0:
        return image
    
    scale = max_width / float(width)
    new_height = int(height * scale)
    return cv2.resize(image, (max_width, new_height), interpolation=cv2.INTER_AREA)

def convert_to_grayscale(image: np.ndarray) -> np.ndarray:
    """
    Converts a BGR or BGRA image array to single-channel 8-bit grayscale.
    """
    if len(image.shape) == 2:
        return image
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2GRAY)
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

def crop_black_borders_with_offset(image: np.ndarray) -> Tuple[np.ndarray, int, int]:
    """
    Conservatively crops zero/black padding borders from a stitched mosaic image
    and returns (cropped_image, crop_offset_x, crop_offset_y).
    """
    gray = convert_to_grayscale(image)
    _, thresh = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return image, 0, 0
    
    c = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(c)
    
    if w <= 0 or h <= 0:
        return image, 0, 0
        
    return image[y:y+h, x:x+w], int(x), int(y)

def crop_black_borders(image: np.ndarray) -> np.ndarray:
    """
    Conservatively crops zero/black padding borders from a stitched mosaic image.
    Preserves actual floor content.
    """
    cropped, _, _ = crop_black_borders_with_offset(image)
    return cropped

