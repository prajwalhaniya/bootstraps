import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useStore from "@/store"
import { useToast } from "@/hooks/use-toast"

export default function SampleApp() {
    const { toast } = useToast()

    const { setPluginName, setPluginInfo } = useStore((state: any) => state);


    function successToast() {
        toast({
            variant: "default",
            className: "bg-green-500 text-white",
            title: "Success toast",
            description: "The toast is a success toast",
        });
    }

   function destructiveToast() {
    setPluginName("Sample")
    setPluginInfo("This is a sample page.")
    toast({
        variant: "destructive",
        title: "Invalid",
        description: "test toast",
    })
   }

   useEffect(() => {
    successToast();
    setTimeout(() => {
        destructiveToast();
    }, 3000);
   }, []);

    return (
        <div className="container mx-auto p-4">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Sample</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This is a sample page.</p>
                </CardContent>
            </Card>
        </div>
    )
}

