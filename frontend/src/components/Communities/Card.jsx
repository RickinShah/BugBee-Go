import { useState } from "react";
import { Pencil } from "lucide-react"; // Optional: you can use this if you're using Lucide icons

const Card = ({ name }) => {
    const [toggle, setToggle] = useState(false);
    const [value, setValue] = useState(name);

    return (
        <div className="bg-[#0e1629] text-white rounded-xl p-3 m-2 w-full max-w-sm shadow-lg border border-white/10">
            <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-blue-400 truncate">
                    {name}
                </p>
                <button
                    onClick={() => setToggle(!toggle)}
                    className="hover:scale-110 transition-transform"
                >
                    <img
                        src="../src/assets/down-chevron.png"
                        alt="toggle"
                        className={`w-4 h-4 transition-transform duration-300 ${
                            toggle ? "rotate-180" : ""
                        }`}
                    />
                </button>
            </div>

            {toggle && (
                <div className="mt-3 animate-fade-in">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-3 py-1 rounded-md bg-white/10 text-blue-100 placeholder:text-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Edit name"
                    />
                    <button
                        onClick={() => setToggle(false)}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white text-sm font-medium py-1 rounded-md"
                    >
                        Save
                    </button>
                </div>
            )}
        </div>
    );
};

export default Card;
