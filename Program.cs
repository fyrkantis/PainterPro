using Scriban;
using Scriban.Parsing;
using Scriban.Runtime;
using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Web;

namespace PainterPro
{
	public static class Website
	{
		public static string currentDirectory = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.Parent.FullName;
		public static Dictionary<string, string> appsettings = JsonSerializer.Deserialize<Dictionary<string, string>>(File.OpenRead(currentDirectory + "\\appsettings.json"));
		/*public static X509Certificate2Collection certificates = new X509Certificate2Collection()
		{
			//new X509Certificate2(currentDirectory + "\\certificates\\Swish\\Swish_Merchant_TestCertificate_1234679304.key", "swish"),
			new X509Certificate2(currentDirectory + "\\certificates\\Swish\\Swish_Merchant_TestCertificate_1234679304.p12", "swish"),
			new X509Certificate2(currentDirectory + "\\certificates\\Swish\\Swish_Merchant_TestCertificate_1234679304.pem", "swish")
		};*/

		public static Dictionary<int, DrawRequest> drawRequests = new Dictionary<int, DrawRequest>();
		
		public static async void HandleConnection(this HttpListenerContext context)
		{
			HttpListenerRequest request = context.Request;
			HttpListenerResponse response = context.Response;
			Stream output = response.OutputStream;
			response.ContentEncoding = Encoding.UTF8;

			if (request.HttpMethod.ToLower() == "post")
			{
				if (await HandlePostAsync(request, response))
				{
					return;
				}
			}

			if (request.Url == null)
			{
				response.Send(400, "Bad Request", "No requested URL was specified.");
				return;
			}
			if (request.Url.LocalPath == "/index.html")
			{
				response.SendRedirect("/", 308, "Permanent Redirect");
				return;
			}
			
			string path;
			if (request.Url.LocalPath == "/")
			{
				path = Path.Combine(currentDirectory, "website\\index.html");
			} else
			{
				path = Path.Combine(currentDirectory, "website\\", request.Url.LocalPath.Replace('/', '\\').TrimStart('\\'));
			}

			if (!File.Exists(path))
			{
				response.Send(404, "Not Found", "The requested file '" + request.RawUrl + "' could not be found.");
				return;
			}
			
			response.ContentType = MimeTypes.GetMimeType(path);
			response.AddHeader("Content-Disposition", "inline; filename = \"" + Path.GetFileName(path) + "\"");
			Console.Write(response.ContentType);
			if (!response.ContentType.EndsWith("html"))
			{
				Console.Write(" Sending file '" + path + "'");
				response.ContentLength64 = new FileInfo(path).Length;

				try
				{
					using (Stream fileStream = File.OpenRead(path))
					{
						fileStream.CopyTo(output);
					}
				}
				catch (IOException)
				{
					response.Send(503, "Service Unavailable", "The server encountered a temporary error when reading '" + request.RawUrl + "'.");
					return;
				}
			}
			else
			{
				Console.Write(" Converting");
				ScriptObject script = new ScriptObject(); // Used for sending arguments to html template.
				script.Add("thing", "Hello World!");
				TemplateContext templateContext = new TemplateContext();
				templateContext.TemplateLoader = new MyTemplateLoader();
				templateContext.PushGlobal(script);

				Template template = Template.Parse(File.ReadAllText(path, Encoding.UTF8));
				byte[] data = Encoding.UTF8.GetBytes(template.Render(templateContext));

				response.ContentLength64 = data.Length;
				output.Write(data);
			}
			
			response.Close();
			Console.WriteLine(" Done!");
		}

		public static async Task<bool> HandlePostAsync(HttpListenerRequest request, HttpListenerResponse response)
		{
			Console.WriteLine(" Reading post:");
			string text;
			using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
			{
				text = reader.ReadToEnd();
			}
			Console.WriteLine(text);

			Dictionary<string, string> fields = new Dictionary<string, string>();
			string[] rawFields = text.Split('&');
			foreach (string rawField in rawFields)
			{
				string[] pair = rawField.Split('=', 2);
				if (pair.Length == 2)
				{
					string key = pair[0];
					string value = HttpUtility.UrlDecode(pair[1]);
					if (!fields.ContainsKey(key))
					{
							fields.Add(key, value);
					}
				}
			}
			DrawRequest drawRequest = new DrawRequest(fields);
			if (drawRequest.pixels.Count >= 1)
			{
				string uuid = Guid.NewGuid().ToString().Replace("-", "");

				// Creates a JSON response with all values in appsettings.json, as well as some new ones.
				Dictionary<string, string> contentFields = new Dictionary<string, string>(appsettings)
				{
					{ "currency", "SEK" },
					{ "amount", "1" },
					{ "message", "David testar, varsågod!" }
				};

				// https://github.com/RickardPettersson/swish-api-csharp/issues/3
				// https://stackoverflow.com/a/61681840
				/*HttpClientHandler handler = new HttpClientHandler();
				
				foreach(X509Certificate2 certificate in certificates)
				{
					handler.ClientCertificates.Add(certificate);
				}
				handler.ClientCertificateOptions = ClientCertificateOption.Manual;
				handler.SslProtocols = System.Security.Authentication.SslProtocols.Tls12;

				HttpClient client = new HttpClient(handler);
				client.BaseAddress = new Uri("https://mss.cpc.getswish.net");
				Console.WriteLine(JsonSerializer.Serialize(contentFields).ToString());
				StringContent content = new StringContent(JsonSerializer.Serialize(contentFields).ToString(), Encoding.UTF8, "application/json");

				try
				{
					HttpListener swishListener = new HttpListener();
					swishListener.Prefixes.Add("https://+:443/");
					swishListener.Start();

					Task<HttpListenerContext> swishConnection = swishListener.GetContextAsync();
					Task<HttpResponseMessage> swishResponse = client.PutAsync("/swish-cpcapi/api/v2/paymentrequests/" + uuid, content);
					HttpResponseMessage responseMessage = await swishResponse;
					Console.WriteLine("Response: " + responseMessage.ToString());
					if (responseMessage.StatusCode != HttpStatusCode.Created)
					{
						Console.WriteLine("Error: " + await responseMessage.Content.ReadAsStringAsync());
						swishListener.Close();
						response.Send(502, "Bad Gateway", "Received an error response from Swish servers.");
						return;
					}

					Console.WriteLine("Connection: " + (await swishConnection).ToString());
					response.Send(201, "Created", "Successfully received pixel drawing request.");
				}
				catch (Exception exception)
				{
					Console.WriteLine(exception.ToString());
					response.Send(504, "Gateway Timeout", "Failed to get response from Swish servers.");
				}*/
			}
			else
			{
				response.Send(422, "Unprocessable Entity", "The pixel drawing request is missing fields.");
				return true;
			}
			return false;
		}

		public static void Send(this HttpListenerResponse response, int code, string message, string? body = "")
		{
			Console.Write(" " + code.ToString() + ":" );

			response.StatusCode = code;
			response.StatusDescription = message;
			response.SendBody("<html><body><h1>" + code.ToString() + ": " + message + "</h1><hr><p>" + body + "</p></body></html>");
		}

		public static void SendBody(this HttpListenerResponse response, string body)
		{
			Console.WriteLine(" " + body + ".");
			response.SendBody(Encoding.UTF8.GetBytes(body));
		}
		public static void SendBody(this HttpListenerResponse response, byte[] bytes)
		{
			response.ContentLength64 = bytes.Length;
			response.ContentType = "text/html";

			response.OutputStream.Write(bytes);
			response.Close();
		}

		public static void SendRedirect(this HttpListenerResponse response, string location, int code, string message = "")
		{
			response.StatusCode = code;
			response.StatusDescription = message;
			response.RedirectLocation = location;
			response.Close();
		}

		public class MyTemplateLoader : ITemplateLoader
		{
			public string GetPath(TemplateContext context, SourceSpan callerSpan, string templateName) // TODO: Adapt for relative paths.
			{
				return Path.Combine(currentDirectory, "website\\", templateName.Replace('/', '\\').TrimStart('\\'));
			}

			public string Load(TemplateContext context, SourceSpan callerSpan, string templatePath)
			{
				return File.ReadAllText(templatePath, Encoding.UTF8);
			}

			public ValueTask<string> LoadAsync(TemplateContext context, SourceSpan callerSpan, string templatePath)
			{
				throw new NotImplementedException();
			}
		}
	}

	public static class Program
	{
		public static void Main()
		{
			// Certificate setup: https://stackoverflow.com/a/33905011
			HttpListener listener = new HttpListener();
			listener.Prefixes.Add("https://+:50000/");
			listener.Start();
			listener.Listen();
		}

		public static void Listen(this HttpListener listener)
		{
			while (true)
			{
				Console.Write("\r\nAwaiting connection...");
				HttpListenerContext context = listener.GetContext();
				Console.Write(" Connected");
				Task.Run(() => context.HandleConnection());
			}
		}
	}
}