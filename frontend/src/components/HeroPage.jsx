const HeroPage = () => {
    return (
        <div className="w-full h-screen bg-[#efbe1f] flex justify-center ">
            {/* <div className="flex flex-col w-full h-screen justify-center items-center z-[0]">
                    <div className="absolute w-[340px] h-[300px] bg-[#ffffff] rounded-full blur-[1000px] opacity-75 left-1/4"></div>
                    <div className="absolute w-[340px] h-[300px] bg-[#ffffff] rounded-full blur-[1000px] opacity-75 left-1/4"></div>
                    <div className="absolute w-[340px] h-[300px] bg-[#ffffff] rounded-full blur-[1000px] opacity-75 left-1/4"></div>
                    <div className="absolute w-[340px] h-[300px] bg-[#ffffff] rounded-full blur-[1000px] opacity-75 left-1/4"></div>
                    <div className="absolute w-[340px] h-[300px] bg-[#ffffff] rounded-full blur-[1000px] opacity-75 left-1/4"></div>
                    <div className="absolute w-[340px] h-[300px] bg-[#ffffff] rounded-full blur-[1000px] opacity-75 left-1/4"></div>
                    <div></div>
                    <div className="absolute text-[300px] text-yellow-400 font-bold z-[1]">Bugbee</div>
                    <div className="relative top-20 text-[300px] text-transparent font-bold text-stroke-200 text-stroke-white">Bugbee</div>
                </div>
                <div className="flex w-full h-screen bg-[#000000] z-[10]">

                </div> */}
            <div className="w-[300px] h-[300px] bg-white rounded-full absolute bottom-1 z-[0]">
                <div className="w-full h-full flex flex-col justify-center items-center text-3xl font-bold">
                    <div>Scroll</div>
                    <div className="text-white text-xs">Scroll</div>
                    <div className="animate-bounce">↓</div>
                    <div className="text-white">Scroll</div>
                    <div>Scroll</div>
                    <div>Scroll</div>
                </div>
            </div>
            <div className="w-full h-40 bg-white absolute bottom-1 z-[0]"></div>
        </div>
    );
};

export default HeroPage;
