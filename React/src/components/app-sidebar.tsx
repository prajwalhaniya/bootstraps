// @ts-nocheck

import { Blocks, Layers, Sparkle, BrainCircuit } from "lucide-react";
import { useEffect } from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.
const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    teams: [
        {
            name: "NAME",
            logo: "",
            plan: "",
        },
    ],
    navMain: [
        {
            title: "General",
            url: "#",
            icon: Blocks,
            isActive: true,
            items: [
                {
                    title: "Sample App",
                    icon: Layers,
                    url: "/sample-route",
                    isActive: false,
                },
            ],
        },

        {
            title: "Specific",
            url: "#",
            icon: BrainCircuit,
            isActive: true,
            items: [
                {
                    title: "Specific App",
                    icon: Sparkle,
                    url: "/specific-app",
                },
            ],
        }
    ],
};

export function AppSidebar() {
    const url = window.location.href;
    const currentPage = url.split("/").pop();

    function setActiveMenuItem(menus: any) {
        for (const menu of menus) {
            menu.isActive = false;
            for (const subMenu of menu.items) {
                if (subMenu.url === "/" + currentPage) {
                    subMenu.isActive = true;
                    menu.isActive = true;
                } else {
                    subMenu.isActive = false;
                }
            }
        }
    }

    useEffect(() => {
        setActiveMenuItem(data.navMain);
    }, [currentPage]);

    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex flex-row flex-justify-content-center flex-align-items-center">
                    {/* <img src="" alt="" className="h-8 w-auto" /> */}
                    <span className="font-bold ml-2" style={{ fontSize: "22px" }}>
                        APP NAME
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
