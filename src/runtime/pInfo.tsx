import React from "react";

interface pInfoProps {
    myparcelData: string;
}

const pInfo: React.FC<pInfoPropsInfoProps> = ({ parcelID }) => {
    return (
        <div>
            <h3>Property Info</h3>
            <p>{myparcelData}</p>
        </div>
    );
};

export default pInfo;