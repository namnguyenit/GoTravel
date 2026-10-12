export class RouteLocationVO {
  public static validate(
    origin: string,
    destination: string
  ): {
    originError: string | null;
    destinationError: string | null;
    matchError: string | null;
  } {
    let originError: string | null = null;
    let destinationError: string | null = null;
    let matchError: string | null = null;

    const trimmedOrigin = origin ? origin.trim() : "";
    const trimmedDest = destination ? destination.trim() : "";

    if (!trimmedOrigin) {
      originError = "Vui lòng nhập điểm khởi hành.";
    } else if (trimmedOrigin.length < 2 || trimmedOrigin.length > 100) {
      originError = "Điểm khởi hành phải có độ dài từ 2 đến 100 ký tự.";
    }

    if (!trimmedDest) {
      destinationError = "Vui lòng nhập điểm đến.";
    } else if (trimmedDest.length < 2 || trimmedDest.length > 100) {
      destinationError = "Điểm đến phải có độ dài từ 2 đến 100 ký tự.";
    }

    if (
      trimmedOrigin &&
      trimmedDest &&
      trimmedOrigin.toLowerCase() === trimmedDest.toLowerCase()
    ) {
      matchError = "Điểm khởi hành và điểm đến không được trùng nhau.";
    }

    return { originError, destinationError, matchError };
  }
}
