import axios from 'axios'

const BASE_URL = 'https://cvreview-api.duckdns.org'

export const reviewCV = async (cvFile, jobDescription) => {
  const formData = new FormData()
  formData.append('cv_file', cvFile)
  formData.append('job_description', jobDescription)

  const response = await axios.post(`${BASE_URL}/review`, formData)
  return response.data
}
