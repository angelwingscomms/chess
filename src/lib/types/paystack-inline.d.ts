declare module '@paystack/inline-js' {
	const PaystackPop: new () => {
		resumeTransaction(
			accessCode: string,
			callbacks?: {
				onLoad?: (response: { id: number; accessCode: string; customer: Record<string, unknown> }) => void;
				onSuccess?: (response: { id: number; reference: string; message: string }) => void;
				onCancel?: () => void;
				onError?: (error: { message: string }) => void;
			}
		): void;
	};
	export default PaystackPop;
}
