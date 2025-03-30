import { useState } from "react";

const Card = ({Channel, Name, TextChannel, }) => {
    const [Toggle, setToggle] = useState(false);
    function ToggleFunction(){
        setToggle(!Toggle)
    }
    return(
        <button className="m-2 p-1 text-white bg-[#000000a1] flex flex-col">
            <div className="w-full h-fit p-1 flex justify-between font-bold text-xl text-purple-600">
                <p>{Name}</p>
                <button className=" w-5 h-5 hover:w-6 hover:h-6 duration-1000" onClick={ToggleFunction}><img src="../src/assets/down-chevron.png" alt="" className="w-5 h-5 hover:w-6 hover:h-6 duration-1000"/></button>
            </div>
            {Toggle &&(
                <div className="bg-[#57157a] flex flex-col p-2 items-start text-md font-semibold rounded-lg">
                    Edit Channel Name
                    <input type="text" placeholder={Name} className="w-full bg-[#ffffff75] text-blue-950 placeholder-blue-950  text-center my-1" />
                    
                    <button className="w-full duration-1000 rounded-lg p-1 bg-[#000000a1] my-1" onClick={ToggleFunction}>Apply</button>
                </div>
            )}
            
            
        </button>
    )


}
export default Card;

