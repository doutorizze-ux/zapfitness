
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const ASAAS_API_URL = process.env.ASAAS_ENV === 'PROD'
    ? 'https://www.asaas.com/api/v3'
    : 'https://sandbox.asaas.com/api/v3';

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

const api = axios.create({
    baseURL: ASAAS_API_URL,
    headers: {
        'access_token': ASAAS_API_KEY
    }
});

console.log(`[Asaas] Service initialized. ENV=${process.env.ASAAS_ENV || 'SANDBOX (default)'}, URL=${ASAAS_API_URL}`);

export const createCustomer = async (name: string, cpfCnpj: string, email: string, phone: string) => {
    try {
        // Search if exists first
        const search = await api.get('/customers', { params: { email } });
        if (search.data.data && search.data.data.length > 0) {
            return search.data.data[0];
        }

        const payload: any = {
            name,
            cpfCnpj,
            email
        };

        if (phone && phone.length === 11) {
            payload.mobilePhone = phone;
        } else {
            payload.phone = phone;
        }

        const response = await api.post('/customers', payload);
        return response.data;
    } catch (error: any) {
        console.error('Asaas Create Customer Error Payload:', { name, cpfCnpj, email, phone });
        console.error('Asaas Create Customer Error Response:', error.response?.data);
        console.error('Asaas Environment URL used:', ASAAS_API_URL);
        throw new Error('Erro ao criar cliente no Asaas: ' + JSON.stringify(error.response?.data?.errors || error.message));
    }
};

export const createSubscription = async (customerId: string, value: number, creditCard?: any, phoneVal?: string) => {
    try {
        const payload: any = {
            customer: customerId,
            billingType: creditCard ? 'CREDIT_CARD' : 'PIX',
            value: value,
            nextDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
            cycle: 'MONTHLY',
            description: 'Assinatura ZapFitness SaaS'
        };

        if (creditCard) {
            payload.creditCard = {
                holderName: creditCard.holderName,
                number: creditCard.number,
                expiryMonth: creditCard.expiryMonth,
                expiryYear: creditCard.expiryYear,
                ccv: creditCard.ccv
            };
            payload.creditCardHolderInfo = {
                name: creditCard.holderName,
                email: 'email@example.com', // Should pass real email too if possible, but maybe minimal change first
                cpfCnpj: creditCard.cpfCnpj,
                postalCode: '00000000',
                addressNumber: '0',
                phone: phoneVal || '00000000000'
            };
        }

        const response = await api.post('/subscriptions', payload);
        return response.data;
    } catch (error: any) {
        console.error('Asaas Create Subscription Error:', error.response?.data);
        throw new Error('Erro ao criar assinatura no Asaas: ' + (error.response?.data?.errors?.[0]?.description || error.message));
    }
};

export const getSubscription = async (id: string) => {
    const response = await api.get(`/subscriptions/${id}`);
    return response.data;
};

export const getPixQrCode = async (paymentId: string) => {
    const response = await api.get(`/payments/${paymentId}/pixQrCode`);
    return response.data;
};
