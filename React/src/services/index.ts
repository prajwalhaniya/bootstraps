import axios from "axios";
import { toast } from "../hooks/use-toast";

export const getRequest = async (url: string, params?: any) => {
    try {
        const response = await axios.get(url, { params });
        return { success: true, data: response.data }
    } catch (error: any) {
        console.log(error);
        toast({
            variant: "destructive",
            title: "Error",
            description: `Error: ${error?.response?.data?.message || error} `,
        })
        return { success: false, error };
    }
}

export const postRequest = async (url: string, data: any) => {
    try {
        const response = await axios.post(url, data);
        return { success: true, data: response.data }
    } catch (error: any) {
        console.log(error);
        toast({
            variant: "destructive",
            title: "Error",
            description: `Error: ${error?.response?.data?.message || error}`,
        })
        return { success: false, error };
    }
}