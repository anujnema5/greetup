type IconName = "apple" | "google" | string;

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: IconName;
    size?: number;
    color?: string;
}

export const CustomIcon: React.FC<IconProps> = ({
    name,
    size = 24,
    color = "currentColor",
    ...props
}) => {
    switch (name) {
        case "apple":
            return (
                <svg
                    width={size}
                    height={size}
                    fill={color}
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    {...props}
                >
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                </svg>
            );

        case "google":
            return (
                <svg
                    width="1.2em"
                    height="1.2em"
                    id="icon-google"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="inline-block shrink-0 align-sub text-inherit size-lg"
                >
                    <g clipPath="url(#clip0)">
                        <path
                            d="M15.6823 8.18368C15.6823 7.63986 15.6382 7.0931 15.5442 6.55811H7.99829V9.63876H12.3194C12.1401 10.6323 11.564 11.5113 10.7203 12.0698V14.0687H13.2983C14.8122 12.6753 15.6823 10.6176 15.6823 8.18368Z"
                            fill="#4285F4"
                        ></path>
                        <path
                            d="M7.99812 16C10.1558 16 11.9753 15.2915 13.3011 14.0687L10.7231 12.0698C10.0058 12.5578 9.07988 12.8341 8.00106 12.8341C5.91398 12.8341 4.14436 11.426 3.50942 9.53296H0.849121V11.5936C2.2072 14.295 4.97332 16 7.99812 16Z"
                            fill="#34A853"
                        ></path>
                        <path
                            d="M3.50665 9.53295C3.17154 8.53938 3.17154 7.4635 3.50665 6.46993V4.4093H0.849292C-0.285376 6.66982 -0.285376 9.33306 0.849292 11.5936L3.50665 9.53295Z"
                            fill="#FBBC04"
                        ></path>
                        <path
                            d="M7.99812 3.16589C9.13867 3.14825 10.241 3.57743 11.067 4.36523L13.3511 2.0812C11.9048 0.723121 9.98526 -0.0235266 7.99812 -1.02057e-05C4.97332 -1.02057e-05 2.2072 1.70493 0.849121 4.40932L3.50648 6.46995C4.13848 4.57394 5.91104 3.16589 7.99812 3.16589Z"
                            fill="#EA4335"
                        ></path>
                    </g>
                    <defs>
                        <clipPath id="clip0">
                            <rect width="15.6825" height="16" fill="white"></rect>
                        </clipPath>
                    </defs>
                </svg>
            );

        // 👉 Just paste new SVG here for new icons
        // case "facebook":
        //   return (
        //     <svg ...> ... </svg>
        //   );

        default:
            return null;
    }
};
