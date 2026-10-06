import { Api } from "@/shared/api";

const PaymentService = {
  createPayment: async (orderId: string) => {
    return await Api.post("/v1/payments/create", { orderId });
  },
  getPayment: async (paymentId: string) => {
    return await Api.get(`/v1/payments/${paymentId}`);
  },
  getPaymentByOrder: async (orderId: string) => {
    return await Api.get(`/v1/payments/order/${orderId}`);
  },
  getHistory: async (page = 0, size = 10) => {
    return await Api.get(`/v1/payments/history?page=${page}&size=${size}`);
  },

};

export default PaymentService;
