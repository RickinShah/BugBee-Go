import { useState } from "react";
import Scrollbar from "react-scrollbars-custom";

// import Comment from './Comment.jsx';
const Card = ({ imgSrc, Name, ID , UserImage, description, title }) => {

    const CommentData = [
        {
            UserName: "Sam",
            Comments : "Starboy",
            Reply : "yyyyyyyyyyyy",
            count : 0
        },
        {
            UserName: "Paul",
            Comments : "Goooo",
            Reply : "dddddddddddddd",
            count : 1
        },

    ]

    const [Like,setLike] = useState(0);
    const [LikeFlag,setLikeFlag] = useState(true);
    function LikeSetter(){
        if(LikeFlag == true){
            setLike(Like + 1);
            setLikeFlag(false);
            
        }
        else{
            setLike(Like - 1);
            setLikeFlag(true);

        }
    }
    const [CommentToggle,setCommentToggle] = useState(false);

    function CommentToggleFunction(){
        setCommentToggle(!CommentToggle);
    }
    
    function ReplyToggleFunction(){
        setReplyToggle(!ReplyToggle);
    }


    return (
        <div className=" bg-gradient-to-br from-80% from-[#4b207a70] to-[#8c02a170] w-full h-[600px] rounded-lg p-2 my-5">
                <div className="h-10 flex">
                    <img src={UserImage} alt="Post"  className="rounded-full w-8 h-8" />
                    <h3 className="mx-3 font-semibold">{Name}</h3>
                    <h2 className="text-gray-400">@{ID}</h2>

                </div>
                <br />
                <div className="flex w-full h-4/5 ">
                <div className= {`${CommentToggle? '':'hidden'} w-11/12 h-fit rounded-lg bg-[#230a367a] bg-opacity-90  absolute`}>
                            {CommentData.map((CommentData, index) => (
                                <div className="w-full h-full flex flex-col">
                                    <div className="rounded m-2 p-2 ">
                                        <div className="w-full h-7 flex items-center p-2 my-1">
                                        <img src={UserImage} alt="Post"  className="rounded-full w-6 h-6" />
                                        <h3 className="mx-4 font-medium">{CommentData.UserName}</h3>

                                        </div>
                                        <div className="w-full h-fit bg-[#31144e] my-1 flex justify-between rounded-md">
                                            <p className="text-white p-1 font-semibold">{CommentData.Comments}</p>
                                        </div>
                                       
                                        
                                    </div>
                                </div>
                            ))}
                        <div className="flex flex-col justify-center items-center m-3">
                            <input type="text" className="bg-white w-2/3 text-black font-bold p-2 m-2" placeholder="Type to Comment"/>
                            <div className="w-2/3 h-fit m-2 flex">
                                <button className="w-1/2 h-full rounded-lg p-2  font-bold mx-1
                                                    bg-[#9b9b9b98] hover:bg-[#641e80] hover:text-gray-200 text-gray-300 duration-700">Comment</button>
                                <button className="w-1/2 h-full bg-[#9b9b9b98] rounded-lg p-2 text-gray-300 duration-700 font-bold mx-1
                                                    hover:bg-red-600" onClick={CommentToggleFunction}>Close</button>
                            </div>
                        </div>
                </div>
                    <div className="flex items-center justify-center bg-[#1a072cbf] h-full w-full rounded-3xl">
                        <img src={imgSrc} alt="Post"  className={`rounded-md w-fit h-full`} />
                        
                    </div>
                    
                    
                </div>
                <div>
                    <div className=" h-full w-full flex justify-around my-3">
                            <div  className="flex w-fit h-full">
                            <button className={`${LikeFlag ? 'bg-[#3f3f3f00] hover:bg-[#9b9b9b6b] hover:text-gray-300 text-gray-400' : 'bg-[#9b9b9b6b] text-gray-300 hover:bg-[#fc3452] hover:text-yellow-400' } p-1 my-1 m-1 w-10 rounded-full duration-700`} onClick={LikeSetter}>{Like}</button>
                            </div>
                        
                        
                            <div  className="flex w-fit h-full">

                                <button className="bg-[#3f3f3f00] hover:bg-[#9b9b9b6b] hover:text-gray-300 text-gray-400 p-1 my-1 m-5 w-10 rounded-full duration-700" onClick={CommentToggleFunction} >C</button>
                                
                            </div>

                            <div  className="flex w-fit h-full">

                                <button className="bg-[#3f3f3f00] hover:bg-[#9b9b9b6b] hover:text-gray-300 text-gray-400 p-1 my-1 m-5 w-10 rounded-full duration-700"  >Share</button>
                                
                            </div>

                            <div  className="flex w-fit h-full">

                                <button className="bg-[#3f3f3f00] hover:bg-[#9b9b9b6b] hover:text-gray-300 text-gray-400 p-1 my-1 m-5 w-10 rounded-full duration-700"  >Save</button>
                                
                            </div>
                            
                        
                    </div>

                </div>

        </div>
    );
};

export default Card;
