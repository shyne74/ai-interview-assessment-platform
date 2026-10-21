const ResultAnalysis = require("../models/result_schema")
const Interview = require("../models/interview_schema")
const axios = require("axios")


exports.analyzeResult = async function(req,res){
   try{

    const {id} = req.params

    const interview =await Interview.findOne({
        _id:id,
        candidateId:req.user._id
    })

    if(!interview){
        return res.status(404).json({message:"interview not found"})
    }

    if(interview.status !== "completed" && interview.status !== "evaluated"){
        return res.status(400).json({message:"please complete the interview before"})
   }

   const existingAnalysis = await ResultAnalysis.findOne({
    interviewId:interview._id
   })

   if(existingAnalysis){
    return res.status(200).json({message:"analyse already done",result:existingAnalysis})
   }


   const FASTAPI_URL = process.env.FASTAPI_URL ||"http://127.0.0.1:8000"

   const analysisData = interview.responses.map(function(response){
    return{
        questionText:response.questionText,
        userAnswer:response.userAnswer,
        score:{
        technicalKnowledgeScore:
        response.score?.technicalKnowledgeScore || 0,

        completenessScore:
        response.score?.completenessScore || 0,

        relevanceScore:
        response.score?.relevanceScore || 0,

        clarityScore:
        response.score?.clarityScore || 0,

        overallScore:
        response.score?.overallScore || 0
},
        aiFeedback:response.aiFeedback
    }
   })


    const payload = {
    response:analysisData,
    roleTitle:interview.roleTitle,
    domain:interview.domain
    }   

    console.log(
    "SENDING TO FASTAPI:",
    JSON.stringify(payload,null,2)
    )

    const aiResponse = await axios.post(
    `${FASTAPI_URL}/analyze-results`,payload
    )

   const analysis = aiResponse.data

   const resultAnalysis = await ResultAnalysis.create({
    interviewId:interview._id,

    candidateId:interview.candidateId,

    roleTitle:interview.roleTitle,

    domain:interview.domain,

    overallScore:interview.overallScore,

    skillBreakdown:analysis.skillBreakdown || {},

    strongAreas:analysis.strongAreas || [],

    weakAreas:analysis.weakAreas || [],

    performanceTrend:
        analysis.performanceTrend || "",

    summaryFeedback:
        analysis.summaryFeedback || ""
   })
   return res.status(201).json({message:"result analysis done successfully", result: resultAnalysis})



}catch(err){

    console.error(
        "RESULT ANALYSIS ERROR:",
        err.response?.data || err.message
    )

    return res.status(500).json({
        message:err.response?.data || err.message
    })
}
}


exports.getresults = async function(req,res){
    try{
        const{id}=req.params
        const result = await ResultAnalysis.findOne({
            interviewId:id,
            candidateId:req.user._id
        })
        if(!result){
            return res.status(400).json({message:"there is no result available"})
        }
        return res.status(200).json({result})
    }catch(err){
        return res.status(500).json({message:"couldnt get the result for interview"})
    }
}
exports.getallresults = async function(req,res){
    try{
        const results = await ResultAnalysis.find({
            candidateId:req.user._id
        }).sort({createdAt:-1})
        return res.status(200).json({results})
    }catch(err){
         return res.status(500).json({message:err.message})
    }
}

exports.getAllResultsAdmin = async function(req,res){
    try{
        const results = await ResultAnalysis.find()
            .populate("candidateId","username email")
            .populate("interviewId")
            .sort({createdAt:-1});
        return res.status(200).json({results})
    }catch(error){
        return res.status(500).json({message:error.message})
    }
}

exports.getAnalytics = async function(req,res){
    try{
        const results = await ResultAnalysis.find()
        const totalResults = results.length

        const averageScore = totalResults?Number((results.reduce((sum,r)=>sum+r.overallScore,0)/totalResults).toFixed(1)):0
        return res.status(200).json({
            totalResults,
            averageScore
    })
}catch(err){
        return res.status(500).json({message:err.message})
    }
}